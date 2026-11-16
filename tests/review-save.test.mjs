import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const load = (path, overrides) => {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

test('successful submission resets preserved writer state, editor and files; failure keeps the review', () => {
  const previousWindow = globalThis.window;
  try {
    for (const succeeds of [true, false]) {
      const storage = new Map([['draft', 'saved review'], ['other', 'keep']]);
      globalThis.window = { localStorage: { removeItem: (key) => storage.delete(key) } };
      const navigations = [];
      let callbacks;
      let pending = false;
      let submissions = 0;
      const { emptyFields } = load('_features/review/lib/review-types.ts', {});
      const state = [];
      const files = { current: new Map([['blob:cover', new Blob(['image'])]]) };
      let editorVersion;
      let body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '작성한 본문' }] }] };
      let index = 0;
      const { useReviewWriter: renderWriter } = load('_features/review/hooks/use-review-writer.ts', {
        react: {
          useState: (initial) => {
            const slot = index++;
            if (!(slot in state)) state[slot] = initial;
            return [state[slot], (value) => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
          },
          useRef: (initial) => {
            const slot = index++;
            if (!(slot in state)) state[slot] = initial instanceof Map ? files : { current: initial };
            return state[slot];
          },
          useEffect: () => {},
        },
        '@tiptap/react': { useEditor: (options, [version]) => {
          if (editorVersion !== undefined && editorVersion !== version) body = options.content;
          editorVersion = version;
          return { getJSON: () => body };
        } },
        '../lib/editor-config': { createExtensions: () => [], richTextClasses: '' },
        '../lib/local-images': { createLocalImage: () => '' },
        '../lib/review-limits': { countBodyImages: () => 0, MAX_BODY_IMAGES: 10 },
        '../lib/review-types': { emptyFields },
        '../lib/review-validation': { hasRequiredReviewFields: () => true },
        '../lib/draft-storage': {},
        '../lib/draft': { DRAFT_KEY: 'draft' },
        './use-review': { useCreateReview: () => ({ isPending: pending, mutate: (_, options) => {
          submissions++;
          callbacks = options;
          pending = true;
        } }) },
        '@/_lib/auth-client': { getAuthErrorMessage: (error) => error.message },
        '@/_lib/notifications': { notifyError: () => {} },
        'next/navigation': { useRouter: () => ({ replace: (path) => navigations.push(path) }) },
      });
      renderWriter().changeField('title', '리뷰');
      index = 0;
      renderWriter().changeField('image', 'blob:cover');
      index = 0;
      renderWriter().submitReview();
      assert.equal(storage.get('draft'), 'saved review');
      assert.deepEqual(navigations, []);
      index = 0;
      const busyWriter = renderWriter();
      assert.equal(busyWriter.isSubmitting, true);
      busyWriter.submitReview();
      busyWriter.changeField('title', 'changed while saving');
      assert.equal(submissions, 1);
      assert.equal(state[0].title, '리뷰');
      if (succeeds) callbacks.onSuccess();
      else callbacks.onError(new Error('save failed'));
      assert.equal(storage.has('draft'), !succeeds);
      assert.equal(storage.get('other'), 'keep');
      assert.deepEqual(navigations, succeeds ? ['/reviews'] : []);
      pending = false;
      index = 0;
      const revisitedWriter = renderWriter();
      if (succeeds) {
        assert.deepEqual(revisitedWriter.fields, emptyFields);
        assert.equal(revisitedWriter.resetVersion, 1);
        assert.deepEqual(revisitedWriter.editor.getJSON(), { type: 'doc', content: [{ type: 'paragraph' }] });
        assert.equal(files.current.size, 0);
      } else {
        assert.equal(revisitedWriter.fields.title, '리뷰');
        assert.equal(revisitedWriter.fields.image, 'blob:cover');
        assert.equal(revisitedWriter.resetVersion, 0);
        assert.equal(files.current.size, 1);
      }
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('writer disables its entire fieldset while submitting and connects draft save', () => {
  const Form = load('_features/review/components/form/review-writer-form.tsx', {
    react: { useState: () => [false, () => {}] },
    '../../lib/review-validation': { hasRequiredReviewFields: () => true },
    '../../lib/review-limits': { MAX_VERDICT_LENGTH: 500 },
    ...Object.fromEntries(['review-basics-fields', 'review-cover-image', 'review-body-editor', 'point-fields']
      .map((name) => [`./${name}`, { default: 'section' }])),
  }).default;
  const saveDraft = () => {};
  for (const isSubmitting of [true, false]) {
    const form = Form({ fields: { verdict: '', pros: [], cons: [] }, isSubmitting, saveDraft });
    assert.equal(form.type, 'fieldset');
    assert.equal(form.props.disabled, isSubmitting);
    const aside = form.props.children[1];
    const draftButton = aside.props.children[1].props.children.props.children[0];
    assert.equal(draftButton.props.onClick, saveDraft);
  }
});

test('body editor turns editing off while busy and restores editing afterward', () => {
  const editable = [];
  const Body = load('_features/review/components/form/review-body-editor.tsx', {
    react: { useRef: () => ({ current: null }), useEffect: (effect) => effect() },
    '@tiptap/react': { useEditorState: () => 0, EditorContent: 'editor' },
    '../../lib/review-limits': { countBodyImages: () => 0, MAX_BODY_IMAGES: 10 },
    './editor-toolbar': { default: 'toolbar' },
    './review-body-editor.css': {},
  }).default;
  const editor = { setEditable: (value) => editable.push(value) };
  Body({ editor, readingImage: true });
  Body({ editor, readingImage: false });
  assert.deepEqual(editable, [false, true]);
});

test('detail skeleton places basic info inside the content column and includes all detail regions', () => {
  const Skeleton = load('_features/review/components/detail/review-detail-skeleton.tsx', {}).default;
  const tree = Skeleton();
  assert.equal(tree.props.role, 'status');
  const grid = tree.props.children[1];
  assert.ok(grid.props.className.includes('270px'));
  const [content, sidebar] = grid.props.children;
  assert.equal(content.props.children.length, 5);
  assert.ok(content.props.children[0].props.className.includes('mb-8'));
  assert.equal(sidebar.props.children.length, 2);
  assert.equal(sidebar.props.children[0].props.children[2].props.children.length, 4);
});
