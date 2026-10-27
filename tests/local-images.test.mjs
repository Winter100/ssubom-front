import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const compiled = ts.transpileModule(
  fs.readFileSync('app/(route)/reviews/new/_lib/local-images.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } },
).outputText;
const loaded = { exports: {} };
const readFiles = [];
const loadDependency = (name) => {
  assert.equal(name, './editor-config');
  return {
    readImage: async (file) => {
      readFiles.push(file);
      return `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
    },
  };
};
new Function('require', 'module', 'exports', compiled)(loadDependency, loaded, loaded.exports);
const { createLocalImage, getImageSources, replaceImageSources, serializeImages } = loaded.exports;

test('Blob preview retains original bytes and becomes unavailable after revocation', async () => {
  const file = new File(['original-image'], 'photo.png', { type: 'image/png' });
  const source = createLocalImage(file);
  try {
    assert(source.startsWith('blob:'));
    assert.equal(await (await fetch(source)).text(), 'original-image');
  } finally {
    URL.revokeObjectURL(source);
  }
  await assert.rejects(fetch(source));
});

test('invalid images are rejected before creating preview URLs', () => {
  assert.throws(() => createLocalImage(new File(['x'], 'bad.svg', { type: 'image/svg+xml' })));
  assert.throws(() => createLocalImage(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })));
});

test('nested image replacement preserves order, text, attributes and original document', () => {
  const body = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'before' }] },
    { type: 'blockquote', content: [{ type: 'image', attrs: { src: 'blob:first', alt: 'first', width: 320, height: 180 } }] },
    { type: 'image', attrs: { src: 'blob:second' } },
    { type: 'image', attrs: { src: 'blob:first' } },
  ] };
  assert.deepEqual(getImageSources(body), ['blob:first', 'blob:second']);
  const replaced = replaceImageSources(body, new Map([['blob:first', 'saved:first']]));
  assert.equal(replaced.content[1].content[0].attrs.src, 'saved:first');
  assert.equal(replaced.content[1].content[0].attrs.alt, 'first');
  assert.equal(replaced.content[1].content[0].attrs.width, 320);
  assert.equal(replaced.content[1].content[0].attrs.height, 180);
  assert.deepEqual(replaced.content[0], body.content[0]);
  assert.equal(body.content[1].content[0].attrs.src, 'blob:first');
  assert.equal(replaced.content[2].attrs.src, 'blob:second');
});

test('draft serialization reads original File without changing the preview registry', async () => {
  const file = new File(['image'], 'body.png', { type: 'image/png' });
  const files = new Map([['blob:body', file]]);
  const sources = await serializeImages(['blob:body', ''], files);
  assert.equal(readFiles.at(-1), file);
  assert.equal(files.get('blob:body'), file);
  assert.equal(sources.get('blob:body'), 'data:image/png;base64,aW1hZ2U=');
  assert.equal(sources.get(''), '');
  await assert.rejects(serializeImages(['blob:missing'], files));
});
