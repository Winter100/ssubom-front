import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { getSchema } from '@tiptap/core';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, dependencies = {}) => {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const limits = load('_features/review/lib/review-limits.ts');
const { createExtensions } = load('_features/review/lib/editor-config.ts', {
  './review-limits': limits,
});

test('toolbar formatting survives JSON storage and renders in review details', () => {
  const extensions = createExtensions();
  const schema = getSchema(extensions);
  const content = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [
        { type: 'text', text: '밑줄', marks: [{ type: 'underline' }] },
        { type: 'text', text: '취소선', marks: [{ type: 'strike' }] },
        { type: 'text', text: '코드', marks: [{ type: 'code' }] },
      ] },
      { type: 'horizontalRule' },
      { type: 'codeBlock', attrs: { language: null }, content: [
        { type: 'text', text: '<example>' },
      ] },
    ],
  };
  const restored = schema.nodeFromJSON(JSON.parse(JSON.stringify(content)));
  restored.check();
  assert.deepEqual(JSON.parse(JSON.stringify(restored.toJSON())), content);
  const html = renderToStaticMarkup(renderToReactElement({ content: restored, extensions }));
  assert.match(html, /<u>밑줄<\/u>/);
  assert.match(html, /<s>취소선<\/s>/);
  assert.match(html, /<code>코드<\/code>/);
  assert.match(html, /<hr\s*\/>/);
  assert.match(html, /<pre><code>&lt;example&gt;<\/code><\/pre>/);
});
