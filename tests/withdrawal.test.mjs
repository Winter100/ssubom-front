import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient } from '@tanstack/react-query';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, overrides = {}) => {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? (name.endsWith('.css') ? {} : name === '@/_features/common/components/loading-spinner'
      ? load('_features/common/components/loading-spinner.tsx') : require(name)), loaded, loaded.exports,
  );
  return loaded.exports;
};
const { authKeys } = load('_features/auth/constant/auth.keys.ts');
const { apiPath } = load('_constant/api-path.ts');
class ApiError extends Error {
  constructor(status) { super('API failed'); this.status = status; }
}
const harness = (api, user = { id: 7 }, queryResult = {}) => {
  const client = new QueryClient();
  client.setQueryData(authKeys.me(), user);
  let query;
  let cleared = false;
  const hooks = load('_features/my/hooks/use-withdrawal.ts', {
    react: { useSyncExternalStore: () => true },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useMutation: (options) => options,
      useQuery: (options) => { query = options; return queryResult; },
    },
    '@/_features/auth/hooks/use-auth': { useMe: () => ({ data: user, isPending: false }) },
    '@/_features/auth/constant/auth.keys': { authKeys },
    '@/_features/auth/lib/session': { clearSession: () => { cleared = true; } },
    '@/_lib/api/api': { api, ApiError },
    '@/_constant/api-path': { apiPath },
  });
  return { ...hooks, client, query: () => query, cleared: () => cleared };
};

test('withdrawal submits unchanged password, caches reservation, and cancels via DELETE', async () => {
  const reserved = { requestedAt: '2026-11-16T06:00:00Z', scheduledAt: '2026-11-17T15:00:00Z' };
  const calls = [];
  const h = harness({
    post: async (...args) => { calls.push(args); return { data: reserved }; },
    delete: async (...args) => { calls.push(args); },
  });
  const action = h.useWithdrawalAction(7);
  assert.equal(action.retry, false);
  assert.equal(action.gcTime, 0);
  const result = await action.mutationFn({ type: 'request', password: ' secret ' });
  await action.onSuccess(result);
  assert.deepEqual(calls[0], [apiPath.withdrawal, { password: ' secret ' }]);
  assert.deepEqual(h.client.getQueryData(authKeys.withdrawal(7)), reserved);
  const cancelled = await action.mutationFn({ type: 'cancel' });
  await action.onSuccess(cancelled);
  assert.deepEqual(calls[1], [apiPath.withdrawal]);
  assert.deepEqual(h.client.getQueryData(authKeys.withdrawal(7)), { requestedAt: null, scheduledAt: null });
  h.client.clear();
});

test('reservation checks fail closed and recheck server state before writes', async () => {
  for (const state of [
    { isPending: true }, { isError: true },
    { data: { scheduledAt: '2026-11-17T15:00:00Z' } },
  ]) {
    const h = harness({}, { id: 7 }, state);
    assert.equal(h.useWithdrawal().blocked, true);
    assert.equal(h.query().refetchOnWindowFocus, 'always');
    h.client.clear();
  }
  const h = harness({}, { id: 7 }, {
    data: { scheduledAt: null },
    refetch: async () => ({ data: { scheduledAt: '2026-11-17T15:00:00Z' } }),
  });
  const status = h.useWithdrawal();
  assert.equal(status.blocked, false);
  await assert.rejects(status.assertAllowed(), /탈퇴 예약 중/);
  h.client.clear();
});

test('anonymous queries stay disabled and missing accounts clear the session', async () => {
  const anonymous = harness({}, null, { isPending: true, fetchStatus: 'idle' });
  assert.equal(anonymous.useWithdrawal().isPending, false);
  assert.equal(anonymous.query().enabled, false);
  const h = harness({ get: async () => { throw new ApiError(404); } });
  h.useWithdrawal();
  await assert.rejects(h.query().queryFn({ signal: undefined }), ApiError);
  assert.equal(h.cleared(), true);
  anonymous.client.clear();
  h.client.clear();
});

test('account switch rejects stale actions and does not update another account cache', async () => {
  const h = harness({});
  const action = h.useWithdrawalAction(7);
  h.client.setQueryData(authKeys.me(), { id: 8 });
  await assert.rejects(action.mutationFn({ type: 'cancel' }), /로그인 정보/);
  await action.onSuccess({ requestedAt: null, scheduledAt: null });
  assert.equal(h.client.getQueryData(authKeys.withdrawal(7)), undefined);
  h.client.clear();
});

test('withdrawal UI explains automatic deletion and renders Seoul reservation time', () => {
  const Section = load('_features/my/components/withdrawal-section.tsx', {
    '@/_lib/api/api': { ApiError },
    '@/_lib/auth-client': { getAuthErrorMessage: () => '' },
    '../hooks/use-withdrawal': {
      useWithdrawal: () => ({ data: { scheduledAt: '2026-11-17T15:00:00Z' } }),
      useWithdrawalAction: () => ({ reset: () => {}, isPending: false }),
    },
  }).default;
  const html = renderToStaticMarkup(createElement(Section, { memberId: 7 }));
  assert.match(html, /모든 게시글\(리뷰\)은 자동으로 삭제/);
  assert.match(html, /복구할 수 없습니다/);
  assert.match(html, /탈퇴 예약 취소/);
  assert.match(html, /2026\. 11\. 18\./);
  assert.match(html, /00:00/);
  assert.match(html, /한국 시간/);
});

test('reserved writers redirect before mounting the editor; pending status does not redirect', () => {
  for (const reserved of [true, false]) {
    const redirects = [];
    const Writer = load('_features/review/components/form/review-writer.tsx', {
      react: { useEffect: (effect) => effect() },
      'next/navigation': { useRouter: () => ({ replace: (href) => redirects.push(href) }) },
      '../../hooks/use-review-writer': { useReviewWriter: () => { throw new Error('Editor must not mount'); } },
      './review-writer-form': { default: 'form' },
      '../../hooks/use-review': { useCategories: () => { throw new Error('Categories must not load'); } },
      '../detail/review-detail-back-button': { default: 'back' },
      '@/_features/my/components/withdrawal-notice': { default: () => createElement('p', null, '확인 중') },
      '@/_features/my/hooks/use-withdrawal': {
        useWithdrawal: () => ({ blocked: true, data: reserved ? { scheduledAt: '2026-11-17T15:00:00Z' } : undefined }),
      },
    }).default;
    const html = renderToStaticMarkup(Writer({}));
    assert.deepEqual(redirects, reserved ? ['/mypage'] : []);
    assert.ok(!html.includes('contenteditable'));
  }
});

test('reserved review links target mypage and never prefetch the editor', () => {
  const WriteLink = load('_features/review/components/review-write-link.tsx', {
    'next/link': { default: ({ href, children, prefetch }) => {
      assert.equal(prefetch, false);
      return createElement('a', { href }, children);
    } },
    '@/_features/my/hooks/use-withdrawal': {
      useWithdrawal: () => ({ blocked: true, data: { scheduledAt: '2026-11-17T15:00:00Z' } }),
    },
  }).default;
  const html = renderToStaticMarkup(createElement(WriteLink, { className: '' }, '리뷰 쓰기'));
  assert.match(html, /href="\/mypage"/);
  assert.ok(!html.includes('/reviews/new'));
  const disabled = renderToStaticMarkup(createElement(WriteLink, {
    className: '', disableWhenReserved: true,
  }, '리뷰 쓰기'));
  assert.match(disabled, /<button[^>]*disabled=""/);
  assert.ok(!disabled.includes('href='));
});

test('all comment changes are blocked before API calls and allowed after cancellation', async () => {
  let reserved = true;
  const calls = [];
  const { useCommentAction } = load('_features/review/hooks/use-comments.ts', {
    '@/_features/my/hooks/use-withdrawal': {
      useWithdrawal: () => ({ assertAllowed: async () => {
        if (reserved) throw new Error('탈퇴 예약 중');
      } }),
    },
    '@tanstack/react-query': { useQueryClient: () => ({}), useMutation: (options) => options },
    '@/_lib/api/api': { ApiError },
    '../constant/comment.keys': {},
    '../lib/comment-cache': {},
    '../lib/comment-api': { commentApi: {
      create: async () => { calls.push('create'); },
      update: async () => { calls.push('update'); },
      remove: async () => { calls.push('delete'); },
    } },
  });
  const mutation = useCommentAction('42');
  const actions = [
    { type: 'create', parentId: null, content: '댓글' },
    { type: 'create', parentId: 1, content: '답글' },
    { type: 'update', commentId: 1, content: '수정' },
    { type: 'delete', commentId: 1 },
  ];
  for (const action of actions) await assert.rejects(mutation.mutationFn(action), /탈퇴 예약 중/);
  assert.deepEqual(calls, []);
  reserved = false;
  for (const action of actions) await mutation.mutationFn(action);
  assert.deepEqual(calls, ['create', 'create', 'update', 'delete']);
});
