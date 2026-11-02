import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);

test('edit initializes the existing writer and submits locally without restoring a draft or creating a review', async () => {
  const initialReview = {
    title: 'Original', product: 'Product', category: { id: 1, category: 'Test' },
    duration: 'One month', rating: 4, image: '', pros: ['Good'], cons: [],
    verdict: 'Recommended', body: { type: 'doc', content: [{ type: 'paragraph' }] },
  };
  const editedBody = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited' }] }] };
  let editorOptions;
  let submitted;
  let createCalls = 0;
  let restoreCalls = 0;
  const updates = [];
  const dependencies = {
    react: {
      useState: (initial) => [initial, (value) => updates.push(value)],
      useRef: (current) => ({ current }),
      useEffect: () => {},
    },
    '@tiptap/react': { useEditor: (options) => {
      editorOptions = options;
      return { getJSON: () => editedBody };
    } },
    '../lib/editor-config': { createExtensions: () => [], richTextClasses: '' },
    '../lib/local-images': {},
    '../lib/review-limits': {},
    '../lib/review-types': { emptyFields: {} },
    '../lib/review-validation': { hasRequiredReviewFields: () => true },
    '../lib/draft-storage': { restoreReviewDraft: () => { restoreCalls += 1; } },
    './use-review': { useCreateReview: () => ({ isPending: false, mutate: () => { createCalls += 1; } }) },
    '@/_lib/auth-client': { getAuthErrorMessage: (error) => error.message },
    'next/navigation': { useRouter: () => ({}) },
    '../lib/draft': {},
    '@/_lib/notifications': {},
  };
  const source = ts.transpileModule(readFileSync('_features/review/hooks/use-review-writer.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  let release;
  let submissions = 0;
  const writer = compiled.exports.useReviewWriter({
    initialReview,
    onSubmit: (review, files) => {
      submissions++;
      submitted = { review, files };
      return new Promise((resolve) => { release = resolve; });
    },
  });
  assert.equal(writer.fields.title, 'Original');
  assert.deepEqual(editorOptions.content, initialReview.body);
  await editorOptions.onCreate({ editor: {} });
  const pending = writer.submitReview();
  await writer.submitReview();
  assert.equal(submissions, 1);
  const pendingUpdates = updates.length;
  writer.changeField('title', 'Must not change while saving');
  assert.equal(updates.length, pendingUpdates);
  release();
  await pending;
  assert.deepEqual(submitted.review, { ...initialReview, body: editedBody });
  assert.equal(submitted.files.size, 0);
  assert.equal(createCalls, 0);
  assert.equal(restoreCalls, 0);
  const failingWriter = compiled.exports.useReviewWriter({
    initialReview,
    onSubmit: async () => { throw new Error('Update failed'); },
  });
  await failingWriter.submitReview();
  assert.ok(updates.includes('Update failed'));
  assert.equal(failingWriter.fields.title, initialReview.title);
  assert.equal(createCalls, 0);
});
