import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const loadDependency = createRequire(import.meta.url);
const loadTypeScript = (file) => {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => name === './review-limits' ? loadTypeScript('app/(route)/reviews/new/_lib/review-limits.ts') : loadDependency(name),
    compiledModule, compiledModule.exports,
  );
  return compiledModule.exports;
};

const { parseDraft } = loadTypeScript('app/(route)/reviews/new/_lib/draft.ts');
const { emptyFields } = loadTypeScript('app/(route)/reviews/new/_lib/review-types.ts');
const { readImage, richTextClasses } = loadTypeScript('app/(route)/reviews/new/_lib/editor-config.ts');
const draft = { ...emptyFields, title: 'A review', body: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }) };

test('draft round-trip preserves separate review fields and the editor JSON', () => {
  assert.deepEqual(parseDraft(JSON.stringify(draft)), draft);
});

test('draft restoration does not require or validate author', () => {
  for (const author of [undefined, 123, 'x'.repeat(100)]) {
    assert.deepEqual(parseDraft(JSON.stringify({ ...draft, author })), draft);
  }
});

test('malformed drafts, unsupported categories, and invalid ratings are rejected', () => {
  for (const raw of ['{', 'null', '{}', JSON.stringify({ ...draft, category: 'unknown' }), JSON.stringify({ ...draft, rating: 6 }), JSON.stringify({ ...draft, body: null })]) {
    assert.throws(() => parseDraft(raw));
  }
});

test('oversized fields and invalid cover image sources are rejected', () => {
  for (const change of [{ title: 'x'.repeat(101) }, { pros: Array(11).fill('point') }, { cons: [123] }, { verdict: 'x'.repeat(1001) }, { image: 'javascript:alert(1)' }]) {
    assert.throws(() => parseDraft(JSON.stringify({ ...draft, ...change })));
  }
});

test('file type and size are checked before reading image data', async () => {
  await assert.rejects(readImage({ type: 'image/svg+xml', size: 20 }));
  await assert.rejects(readImage({ type: 'image/png', size: 2 * 1024 * 1024 + 1 }));
});

test('Tiptap class attributes contain no newlines or empty class tokens', () => {
  assert(!richTextClasses.includes('\n'));
  assert(richTextClasses.split(' ').every((token) => token.length > 0 && !/\s/.test(token)));
});
