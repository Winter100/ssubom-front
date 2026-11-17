import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, dependencies) => {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (name) => dependencies[name] ?? require(name), loaded, loaded.exports,
  );
  return loaded.exports;
};
const images = load('_features/review/lib/local-images.ts', { './editor-config': {} });

test('cover and body selection retain valid files and report every rejected selection', () => {
  for (const target of ['cover', 'body']) {
    const files = new Map();
    const alerts = [];
    const inserted = [];
    const states = [];
    let stateIndex = 0;
    const editor = {
      getJSON: () => ({}),
      chain: () => ({ focus: () => ({ setImage: (image) => ({ run: () => {
        inserted.push(image);
        return true;
      } }) }) }),
    };
    const { useReviewWriter: renderWriter } = load('_features/review/hooks/use-review-writer.ts', {
      react: {
        useEffect: () => {},
        useState: (initial) => {
          const index = stateIndex++;
          states[index] = initial;
          return [initial, (value) => {
            states[index] = typeof value === 'function' ? value(states[index]) : value;
          }];
        },
        useRef: (value) => ({ current: value instanceof Map ? files : value }),
      },
      '@tiptap/react': { useEditor: () => editor },
      '../lib/editor-config': { createExtensions: () => [], richTextClasses: '' },
      '../lib/local-images': images,
      '../lib/review-limits': { countBodyImages: () => 0, MAX_BODY_IMAGES: 10 },
      '../lib/review-types': { emptyFields: { image: '' } },
      '../lib/review-validation': {},
      '../lib/draft-storage': {},
      '../lib/draft': {},
      './use-review': { useCreateReview: () => ({ isPending: false }) },
      '@/_lib/auth-client': {},
      '@/_lib/notifications': { notifyError: (message) => alerts.push(message) },
      '@/_features/my/hooks/use-withdrawal': { useWithdrawal: () => ({ blocked: false }) },
      'next/navigation': { useRouter: () => ({}) },
    });
    const writer = renderWriter();
    try {
      const valid = new File([new Uint8Array(5 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });
      const input = { files: [valid], value: 'photo.jpg' };
      writer.handleImage({ currentTarget: input }, target);
      assert.equal(input.value, '');
      assert.equal(files.size, 1);
      const [source] = files.keys();
      assert.equal(files.get(source), valid);
      assert.equal(target === 'cover' ? states[0].image : inserted[0].src, source);

      for (const file of [
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'camera.jpg', { type: 'image/jpeg' }),
        new File(['heic'], 'gallery.heic', { type: 'image/heic' }),
      ]) {
        for (let attempt = 0; attempt < 2; attempt++) {
          writer.handleImage({ currentTarget: { files: [file], value: file.name } }, target);
          assert.equal(alerts.at(-1), states[2]);
        }
      }
      assert.equal(alerts.length, 4);
      assert.match(alerts[0], /5MB/);
      assert.match(alerts[2], /JPG, PNG, WebP/);
      assert.equal(files.size, 1);
      assert.equal(states[3], false);
    } finally {
      files.forEach((_, source) => URL.revokeObjectURL(source));
    }
  }
});
