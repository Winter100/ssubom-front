import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const load = (path, mocks = {}) => {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => mocks[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const makeComment = (id, parentId = null) => ({
  id, parentId, content: `comment ${id}`, deleted: false,
  createdAt: '2026-11-03T03:00:00Z',
  author: { id: 10, nickname: '작성자', profileImage: null }, replies: [],
});
const keys = load('_features/review/constant/comment.keys.ts');
const cache = load('_features/review/lib/comment-cache.ts');

test('comment API sends the exact public and protected routes, JSON bodies and pagination', async () => {
  const requests = [];
  const created = makeComment(1);
  const page = { content: [created], page: 2, size: 20, totalElements: 25, totalPages: 2 };
  const api = Object.fromEntries(['get', 'post', 'put', 'delete'].map((method) => [method,
    async (...args) => {
      requests.push([method, ...args]);
      return { data: method === 'get' ? page : method === 'post' ? created : undefined };
    },
  ]));
  const { commentApi } = load('_features/review/lib/comment-api.ts', {
    '@/_constant/api-path': { apiPath: { reviews: 'reviews' } },
    '@/_lib/api/api': { api },
    './review-id': load('_features/review/lib/review-id.ts'),
  });
  const signal = new AbortController().signal;
  assert.equal(await commentApi.list('42', 2, 20, signal), page);
  assert.equal(await commentApi.create('42', { content: 'hello', parentId: null }), created);
  await commentApi.create('42', { content: 'reply', parentId: 1 });
  assert.equal(await commentApi.update('42', 1, 'edited'), undefined);
  assert.equal(await commentApi.remove('42', 1), undefined);
  assert.deepEqual(requests, [
    ['get', 'reviews/42/comments', { params: { page: 2, size: 20 }, signal }],
    ['post', 'reviews/42/comments', { content: 'hello', parentId: null }],
    ['post', 'reviews/42/comments', { content: 'reply', parentId: 1 }],
    ['put', 'reviews/42/comments/1', { content: 'edited' }],
    ['delete', 'reviews/42/comments/1'],
  ]);
  await assert.rejects(commentApi.list('01', 1, 20), /리뷰 ID/);
  await assert.rejects(commentApi.remove('42', 0), /댓글 ID/);
});

test('thread cache updates roots and replies without losing deleted threads or duplicating IDs', () => {
  const root = { ...makeComment(1), replies: [makeComment(2, 1)] };
  const created = makeComment(3, 1);
  const replied = cache.updateCommentThreads([root], { type: 'create' }, created);
  assert.deepEqual(replied[0].replies.map(({ id }) => id), [2, 3]);
  assert.deepEqual(cache.updateCommentThreads(replied, { type: 'create' }, created), replied);
  const edited = cache.updateCommentThreads(replied, { type: 'update', commentId: 2, content: 'new' });
  assert.equal(edited[0].replies[0].content, 'new');
  const removed = cache.updateCommentThreads(edited, { type: 'delete', commentId: 1 });
  assert.equal(removed[0].deleted, true);
  assert.equal(removed[0].author, null);
  assert.equal(removed[0].content, '삭제된 댓글입니다');
  assert.equal(removed[0].createdAt, root.createdAt);
  assert.equal(removed[0].replies.length, 2);
  assert.equal(root.deleted, false);
  assert.deepEqual(cache.uniqueCommentThreads([root, root, makeComment(4)]).map(({ id }) => id), [1, 4]);
});

test('infinite query uses server pages and hides separately displayed roots once loaded', () => {
  let options;
  const root = makeComment(1);
  const { useComments } = load('_features/review/hooks/use-comments.ts', {
    '@tanstack/react-query': {
      useInfiniteQuery: (value) => {
        options = value;
        return { data: { pages: [{ content: [root] }, { content: [root, makeComment(2)] }] } };
      },
      useQuery: () => ({ data: [root, makeComment(3)] }),
    },
    '@/_lib/api/api': { ApiError: Error },
    '../constant/comment.keys': keys,
    '../lib/comment-api': { COMMENT_PAGE_SIZE: 20, commentApi: { list: (...args) => args } },
    '../lib/comment-cache': cache,
  });
  const state = useComments('42');
  assert.deepEqual(state.threads.map(({ id }) => id), [1, 2]);
  assert.deepEqual(state.recent.map(({ id }) => id), [3]);
  assert.deepEqual(options.queryKey, ['comments', '42', 'list', 20]);
  assert.deepEqual(options.queryFn({ pageParam: 2, signal: 'signal' }), ['42', 2, 20, 'signal']);
  assert.equal(options.getNextPageParam({ page: 1, totalPages: 2 }), 2);
  assert.equal(options.getNextPageParam({ page: 2, totalPages: 2 }), undefined);
  assert.equal(options.getNextPageParam({ page: 1, totalPages: 0 }), undefined);
});

test('confirmed mutations update list and recent caches and invalidate only this review comments', async () => {
  const client = new QueryClient();
  const { commentKeys } = keys;
  const listKey = commentKeys.list('42', 20);
  const recentKey = commentKeys.recent('42');
  const root = makeComment(1);
  client.setQueryData(listKey, { pages: [{ content: [root] }], pageParams: [1] });
  client.setQueryData(['reviews', 'details', '42'], { title: 'unchanged' });
  client.setQueryData(commentKeys.list('99', 20), { untouched: true });
  const invalidations = [];
  client.invalidateQueries = async (filters) => { invalidations.push(filters); };
  class ApiError extends Error { constructor(status) { super('failed'); this.status = status; } }
  const requests = [];
  const { useCommentAction } = load('_features/review/hooks/use-comments.ts', {
    '@tanstack/react-query': { useQueryClient: () => client, useMutation: (options) => options },
    '@/_lib/api/api': { ApiError },
    '../constant/comment.keys': keys,
    '../lib/comment-api': { commentApi: {
      create: async (...args) => { requests.push(['create', ...args]); return makeComment(21); },
      update: async (...args) => { requests.push(['update', ...args]); },
      remove: async (...args) => { requests.push(['delete', ...args]); },
    } },
    '../lib/comment-cache': cache,
  });
  const mutation = useCommentAction('42');
  const createAction = { type: 'create', content: 'new', parentId: null };
  const newRoot = await mutation.mutationFn(createAction);
  await mutation.onSuccess(newRoot, createAction);
  assert.equal(client.getQueryData(recentKey)[0].id, 21);
  assert.equal(client.getQueryData(listKey).pages[0].content.length, 1);
  const replyAction = { type: 'create', parentId: 21, content: 'reply' };
  await mutation.onSuccess(makeComment(22, 21), replyAction);
  assert.equal(client.getQueryData(recentKey)[0].replies[0].id, 22);
  const updateAction = { type: 'update', commentId: 22, content: 'edited' };
  assert.equal(await mutation.mutationFn(updateAction), undefined);
  await mutation.onSuccess(undefined, updateAction);
  assert.equal(client.getQueryData(recentKey)[0].replies[0].content, 'edited');
  const deleteAction = { type: 'delete', commentId: 21 };
  assert.equal(await mutation.mutationFn(deleteAction), undefined);
  await mutation.onSuccess(undefined, deleteAction);
  assert.equal(client.getQueryData(recentKey)[0].author, null);
  assert.equal(client.getQueryData(recentKey)[0].replies.length, 1);
  await mutation.onSuccess(makeComment(2, 1), { type: 'create', parentId: 1, content: 'reply' });
  assert.equal(client.getQueryData(listKey).pages[0].content[0].replies[0].id, 2);
  mutation.onError(new ApiError(409));
  mutation.onError(new ApiError(404));
  for (const value of invalidations) assert.deepEqual(value, { queryKey: commentKeys.lists('42') });
  assert.deepEqual(client.getQueryData(['reviews', 'details', '42']), { title: 'unchanged' });
  assert.deepEqual(client.getQueryData(commentKeys.list('99', 20)), { untouched: true });
  assert.equal(requests.length, 3);
  client.clear();
});

test('a failed background refresh preserves a confirmed creation without retrying the write', async () => {
  const client = new QueryClient();
  const listKey = keys.commentKeys.list('42', 20);
  client.setQueryData(listKey, { pages: [{ content: [] }], pageParams: [1] });
  const observer = new QueryObserver(client, {
    queryKey: listKey, staleTime: Infinity, retry: false,
    queryFn: async () => { throw new Error('background offline'); },
  });
  const unsubscribe = observer.subscribe(() => {});
  let writes = 0;
  const created = makeComment(21);
  const { useCommentAction } = load('_features/review/hooks/use-comments.ts', {
    '@tanstack/react-query': { useQueryClient: () => client, useMutation: (options) => options },
    '@/_lib/api/api': { ApiError: Error },
    '../constant/comment.keys': keys,
    '../lib/comment-api': { commentApi: { create: async () => { writes++; return created; } } },
    '../lib/comment-cache': cache,
  });
  const mutation = useCommentAction('42');
  const action = { type: 'create', parentId: null, content: 'confirmed' };
  await mutation.onSuccess(await mutation.mutationFn(action), action);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(observer.getCurrentResult().isRefetchError, true);
  assert.equal(writes, 1);
  assert.equal(client.getQueryData(keys.commentKeys.recent('42'))[0].id, 21);
  unsubscribe();
  client.clear();
});
