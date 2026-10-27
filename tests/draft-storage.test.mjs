import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const root = 'app/(route)/reviews/new/_lib/';
const load = (file, dependencies, globals = {}) => {
  const compiled = ts.transpileModule(fs.readFileSync(root + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), compiled)(
    (name) => {
      assert(name in dependencies, name);
      return dependencies[name];
    }, exports, ...Object.values(globals),
  );
  return exports;
};
const draft = load('draft.ts', {});
const { emptyFields } = load('review-types.ts', {});
const images = load('local-images.ts', { './editor-config': {} });
const setup = (raw, fetchImage = fetch) => {
  let saved = raw;
  let content;
  const storage = load('draft-storage.ts', {
    './draft': draft,
    './local-images': images,
  }, {
    window: { localStorage: {
      getItem: () => saved,
      setItem: (key, value) => { assert.equal(key, draft.DRAFT_KEY); saved = value; },
    } },
    fetch: fetchImage,
  });
  const editor = {
    isDestroyed: false,
    schema: { nodeFromJSON: (body) => ({
      check: () => {}, type: { name: 'doc' }, toJSON: () => body,
    }) },
    commands: { setContent: (body, options) => {
      assert.deepEqual(options, { emitUpdate: false });
      content = body;
    } },
  };
  return { storage, editor, saved: () => saved, content: () => content };
};

test('empty storage restores nothing and saving preserves the draft format', async () => {
  const state = setup(null);
  assert.equal(await state.storage.restoreReviewDraft(state.editor, new Map()), null);
  const body = { type: 'doc', content: [{ type: 'paragraph' }] };
  await state.storage.saveReviewDraft(emptyFields, body, new Map());
  assert.deepEqual(JSON.parse(state.saved()), {
    ...emptyFields, body: JSON.stringify(body),
  });
  const restored = await state.storage.restoreReviewDraft(state.editor, new Map());
  assert.deepEqual(restored, emptyFields);
  assert.equal(restored.rating, 0);
});

test('restoring converts inline images to registered Blob URLs', async () => {
  const source = 'data:image/png;base64,aGVsbG8=';
  const body = { type: 'doc', content: [{ type: 'image', attrs: { src: source } }] };
  const raw = JSON.stringify({
    ...emptyFields, image: source, body: JSON.stringify(body),
  });
  const state = setup(raw);
  const files = new Map();
  try {
    const restored = await state.storage.restoreReviewDraft(state.editor, files);
    assert(restored.image.startsWith('blob:'));
    const bodySource = state.content().content[0].attrs.src;
    assert(bodySource.startsWith('blob:'));
    assert.equal(await files.get(bodySource).text(), 'hello');
    assert.equal(files.size, 2);
    assert.equal(state.saved(), raw);
  } finally {
    files.forEach((file, url) => URL.revokeObjectURL(url));
  }
});

test('partial restoration failure removes only newly restored image registrations', async () => {
  const source = 'data:image/png;base64,aGVsbG8=';
  const raw = JSON.stringify({
    ...emptyFields, image: source,
    body: JSON.stringify({ type: 'doc', content: [{ type: 'image', attrs: { src: source } }] }),
  });
  let requests = 0;
  const state = setup(raw, async (url) => {
    if (++requests === 2) throw new Error('Read failed');
    return fetch(url);
  });
  const existing = new File(['existing'], 'existing.png', { type: 'image/png' });
  const files = new Map([['existing', existing]]);
  await assert.rejects(state.storage.restoreReviewDraft(state.editor, files), /Read failed/);
  assert.deepEqual([...files], [['existing', existing]]);
  assert.equal(state.content(), undefined);
  assert.equal(state.saved(), raw);
});
