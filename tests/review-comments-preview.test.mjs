import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const user = { id: 10, nickname: '로그인 사용자', profileImage: '/profile.jpg' };
const makeComment = (id, authorId = 10) => ({
  id, parentId: null, content: `내용 ${id}`, deleted: false,
  createdAt: '2026-11-03T03:00:00Z',
  author: { id: authorId, nickname: `작성자 ${authorId}`, profileImage: null }, replies: [],
});
let authState = { data: user, isPending: false };
let commentState;
const resetComments = () => {
  commentState = {
    threads: [
      { ...makeComment(1), replies: [{ ...makeComment(2, 11), parentId: 1 }] },
      { ...makeComment(3), deleted: true, author: null, replies: [{ ...makeComment(4), parentId: 3 }] },
    ],
    recent: [], isPending: false, isError: false, hasNextPage: false, isFetching: false,
    refetch: () => {}, fetchNextPage: () => {},
  };
};
resetComments();
class ApiError extends Error { constructor(message, errors) { super(message); this.errors = errors; } }
const baseMocks = {
  'next/image': { default: ({ src, alt, width, height, className }) => createElement('img', { src, alt, width, height, className }) },
  '@/_features/auth/hooks/use-auth': { useMe: () => authState },
  '@/_lib/api/api': { ApiError },
  '@/_lib/auth-client': { getAuthErrorMessage: (error, fallback) => error?.message || fallback },
};
const load = (filename, overrides = {}) => {
  const mocks = { ...baseMocks, ...overrides };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => {
    if (mocks[name]) return mocks[name];
    if (name.endsWith('/hooks/use-comments')) return {
      useComments: () => commentState,
      useCommentAction: () => ({ isPending: false, mutateAsync: async () => {} }),
    };
    if (name.endsWith('/lib/comment-api')) return { COMMENT_CONTENT_LIMIT: 1000 };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.tsx`), overrides);
    return dependency(name);
  }, compiled, compiled.exports);
  return compiled.exports;
};
const ReviewComments = load('_features/review/components/detail/review-comments.tsx').default;
const render = () => renderToStaticMarkup(createElement(ReviewComments, { reviewId: '42' }));
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
};

const createHookHarness = () => {
  let cursor = 0;
  const slots = [];
  return {
    reset: () => { cursor = 0; },
    react: {
      useId: () => 'comment-input',
      useState: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
    },
  };
};

test('real authors, ownership, Korea time and deleted parents with replies render correctly', () => {
  authState = { data: user, isPending: false };
  resetComments();
  const html = render();
  const articles = [...html.matchAll(/<article\b[^>]*>(.*?)<\/article>/gs)].map(([article]) => article);
  assert.equal(articles.length, 4);
  assert.match(articles[0], /수정/);
  assert.match(articles[0], /답글 달기/);
  assert.doesNotMatch(articles[1], /수정|답글 달기/);
  assert.match(articles[1], /작성자 11/);
  assert.match(articles[0], /12:00/);
  assert.match(articles[2], /삭제된 댓글입니다/);
  assert.doesNotMatch(articles[2], /<img|<button|작성자/);
  assert.match(articles[3], /내용 4/);
  assert.match(html, /src="\/profile.jpg"/);
  assert.match(html, /aria-label="댓글 등록"/);
});

test('anonymous or pending auth hides form and controls but preserves public comments; session key changes', () => {
  resetComments();
  const keys = [];
  for (const state of [
    { data: null, isPending: false },
    { data: undefined, isPending: true },
    { data: user, isPending: false },
    { data: { ...user, id: 11 }, isPending: false },
  ]) {
    authState = state;
    const tree = ReviewComments({ reviewId: '42' });
    keys.push(find(tree, (node) => node.props?.reviewId === '42').key);
    const html = render();
    assert.match(html, /내용 1/);
    assert.equal(html.includes('<form'), Boolean(state.data));
    if (!state.data) assert.doesNotMatch(html, /답글 달기|수정 저장|aria-haspopup="dialog"/);
  }
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[1], keys[2]);
  assert.notEqual(keys[2], keys[3]);
});

test('loading, initial/next page failures, more and recent comments remain local to the comment section', () => {
  authState = { data: null, isPending: false };
  resetComments();
  commentState = { ...commentState, threads: [], isPending: true };
  assert.match(render(), /댓글을 불러오는 중/);
  commentState = { ...commentState, isPending: false, isError: true, error: new Error('조회 실패') };
  assert.match(render(), /조회 실패/);
  assert.match(render(), /다시 시도/);
  commentState = { ...commentState, threads: [makeComment(1)], hasNextPage: true };
  assert.match(render(), /내용 1/);
  assert.match(render(), /댓글 더 보기/);
  commentState = { ...commentState, isError: false, hasNextPage: false, recent: [makeComment(21)] };
  assert.doesNotMatch(render(), /댓글 더 보기/);
  assert.match(render(), /방금 등록한 댓글/);
  assert.match(render(), /내용 21/);
});

test('form rejects blank and over-limit text, blocks duplicate submits and keeps failed input', async () => {
  const harness = createHookHarness();
  const Form = load('_features/review/components/detail/comment-form.tsx', { react: harness.react }).default;
  let requests = 0;
  let reject;
  const props = { user, label: '댓글 등록', disabled: false, onSave: async () => {
    requests++;
    return new Promise((resolve, fail) => { reject = fail; });
  } };
  const tree = () => { harness.reset(); return Form(props); };
  const input = (value) => find(tree(), (node) => node.type === 'textarea').props.onChange({ target: { value } });
  const submit = () => tree().props.onSubmit({ preventDefault: () => {} });
  input('   ');
  submit();
  assert.equal(requests, 0);
  input('x'.repeat(1001));
  submit();
  assert.equal(requests, 0);
  input('x'.repeat(1000));
  const original = tree();
  original.props.onSubmit({ preventDefault: () => {} });
  original.props.onSubmit({ preventDefault: () => {} });
  assert.equal(requests, 1);
  assert.equal(find(tree(), (node) => node.type === 'textarea').props.disabled, true);
  reject(new ApiError('입력 오류', [{ field: 'content', message: '내용을 확인해 주세요.' }]));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const failed = tree();
  assert.equal(find(failed, (node) => node.type === 'textarea').props.value.length, 1000);
  assert.equal(find(failed, (node) => node.props?.role === 'alert').props.children, '내용을 확인해 주세요.');
  props.onSave = async () => { requests++; };
  submit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(find(tree(), (node) => node.type === 'textarea').props.value, '');
});

test('reply and inline edit forms submit the root target and actual reply ID respectively', async () => {
  const harness = createHookHarness();
  const Thread = load('_features/review/components/detail/comment-thread.tsx', { react: harness.react }).default;
  const calls = [];
  const props = { thread: { ...makeComment(1), replies: [{ ...makeComment(2), parentId: 1 }] },
    user, busy: false, onAction: async (action) => calls.push(action), onDelete: () => {} };
  const tree = () => { harness.reset(); return Thread(props); };
  find(tree(), (node) => node.props?.comment?.id === 1).props.onReply();
  const replyForm = find(tree(), (node) => node.props?.label === '답글 등록');
  await replyForm.props.onSave('reply');
  assert.deepEqual(calls[0], { type: 'create', parentId: 1, content: 'reply' });
  find(tree(), (node) => node.props?.comment?.id === 2).props.onEdit();
  const editForm = find(tree(), (node) => node.props?.label === '수정 저장');
  assert.equal(editForm.props.initialContent, '내용 2');
  await editForm.props.onSave('edited');
  assert.deepEqual(calls[1], { type: 'update', commentId: 2, content: 'edited' });
});

test('delete dialog blocks double requests and dismissal while saving, then preserves errors on failure', async () => {
  authState = { data: user, isPending: false };
  resetComments();
  const harness = createHookHarness();
  let finish;
  let requests = 0;
  let closed = 0;
  const mutation = { isPending: false, mutateAsync: async () => {
    requests++;
    return new Promise((resolve, reject) => { finish = { resolve, reject }; });
  } };
  const Wrapper = load('_features/review/components/detail/review-comments.tsx', {
    react: harness.react,
    '../../hooks/use-comments': { useComments: () => commentState, useCommentAction: () => mutation },
  }).default;
  const content = find(Wrapper({ reviewId: '42' }), (node) => node.props?.reviewId === '42');
  const tree = () => { harness.reset(); return content.type(content.props); };
  const modal = { showModal: () => {}, close: () => { closed++; } };
  find(tree(), (node) => node.type === 'dialog').props.ref.current = modal;
  const open = () => find(tree(), (node) => node.props?.thread?.id === 1).props.onDelete(makeComment(1));
  open();
  const dialog = find(tree(), (node) => node.type === 'dialog');
  const confirm = find(dialog, (node) => node.type === 'button' && node.props.children === '삭제');
  confirm.props.onClick();
  confirm.props.onClick();
  assert.equal(requests, 1);
  let prevented = false;
  dialog.props.onCancel({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  find(dialog, (node) => node.type === 'button' && node.props.children === '취소').props.onClick();
  assert.equal(closed, 0);
  finish.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(closed, 1);
  open();
  find(find(tree(), (node) => node.type === 'dialog'), (node) => node.type === 'button' && node.props.children === '삭제').props.onClick();
  finish.reject(new Error('삭제 실패'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(closed, 1);
  assert.equal(find(tree(), (node) => node.props?.role === 'alert').props.children, '삭제 실패');
});
