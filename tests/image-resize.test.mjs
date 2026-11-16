import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { getSchema } from '@tiptap/core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getImageProps } from 'next/image.js';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const loaded = { exports: {} };
const source = ts.transpileModule(
  fs.readFileSync('_features/review/lib/editor-config.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
).outputText;
const limitSource = ts.transpileModule(fs.readFileSync('_features/review/lib/review-limits.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const limits = { exports: {} };
new Function('exports', limitSource)(limits.exports);
new Function('require', 'module', 'exports', source)(
  (name) => name === './review-limits' ? limits.exports : require(name), loaded, loaded.exports,
);
const extensions = loaded.exports.createExtensions();

test('detail keeps saved image dimensions instead of filling the body width', () => {
  const compiled = ts.transpileModule(
    fs.readFileSync('_features/review/components/detail/review-body.tsx', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const bodyModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === 'next/image') return {
      default: (props) => createElement('img', getImageProps(props).props),
    };
    if (name === '../../lib/editor-config') return loaded.exports;
    if (name === '../../lib/review-image') return { getReviewImageUrl: (src) => src };
    return require(name);
  }, bodyModule, bodyModule.exports);
  for (const width of [320, 800]) {
    const html = renderToStaticMarkup(createElement(bodyModule.exports.default, {
      content: { type: 'doc', content: [{ type: 'image', attrs: {
        src: '/photo.png', width, height: width / 2,
      } }] },
    }));
    assert.ok(html.includes(`width="${width}"`));
    assert.ok(html.includes(`width:${width}px;max-width:100%;height:auto`));
  }
  const html = renderToStaticMarkup(createElement(bodyModule.exports.default, {
    content: { type: 'doc', content: [{ type: 'image', attrs: {
      src: '/original-photo.png', width: null, height: null,
    } }] },
  }));
  assert.ok(html.includes('src="/original-photo.png"'));
  assert.ok(html.includes('width:auto;max-width:100%;height:auto'));
  assert.ok(!html.includes('srcSet='));
  assert.ok(!html.includes('/_next/image'));
});

test('writer and detail use the same available body width', () => {
  const read = (path) => fs.readFileSync(`_features/review/${path}`, 'utf8');
  const writer = read('components/form/review-writer-form.tsx');
  const detail = read('components/detail/review-detail-container.tsx');
  const grid = /lg:grid-cols-\[minmax\(0,1fr\)_\d+px\]/;
  assert.equal(detail.match(grid)?.[0], writer.match(grid)?.[0]);
  const editor = read('hooks/use-review-writer.ts');
  const padding = /px-5 py-4[^`']*?sm:px-7/;
  assert.ok(editor.match(padding));
  assert.ok(detail.includes('border border-transparent px-5 py-4 sm:px-7'));
});

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
