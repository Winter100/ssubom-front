import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { getSchema } from '@tiptap/core';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const loaded = { exports: {} };
const source = ts.transpileModule(
  fs.readFileSync('app/(route)/reviews/new/_lib/editor-config.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
).outputText;
const limitSource = ts.transpileModule(fs.readFileSync('app/(route)/reviews/new/_lib/review-limits.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const limits = { exports: {} };
new Function('exports', limitSource)(limits.exports);
new Function('require', 'module', 'exports', source)(
  (name) => name === './review-limits' ? limits.exports : require(name), loaded, loaded.exports,
);
const extensions = loaded.exports.createExtensions();

test('body images enable aspect-ratio preserving mouse resizing', () => {
  const image = extensions.find((extension) => extension.name === 'image');
  assert.equal(image.options.resize.enabled, true);
  assert.equal(image.options.resize.alwaysPreserveAspectRatio, true);
  assert.deepEqual(image.options.resize.directions, ['bottom-right']);
});

test('resized image dimensions survive the editor JSON round-trip', () => {
  const schema = getSchema(extensions);
  const body = { type: 'doc', content: [{ type: 'image', attrs: {
    src: 'blob:photo', alt: 'photo', title: null, width: 320, height: 180,
  } }] };
  const restored = JSON.parse(JSON.stringify(schema.nodeFromJSON(body).toJSON()));
  assert.deepEqual(restored, body);
});
