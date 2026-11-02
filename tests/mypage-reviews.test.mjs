import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const load = (file, overrides) => {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const findAll = (node, match) => {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, match));
  return [...(match(node) ? [node] : []), ...findAll(node.props?.children, match)];
};
const pageData = (content, overrides = {}) => ({ content, page: 1, size: 10, totalElements: content.length, totalPages: content.length ? 1 : 0, ...overrides });
const boundary = { __esModule: true, default: 'ReviewsQueryBoundary' };

test('delete mutation sends DELETE to the selected review and awaits cache invalidation', async () => {
  const requests = [];
  const invalidations = [];
  let finishInvalidation;
  const invalidated = new Promise((resolve) => { finishInvalidation = resolve; });
  const { useReviewDelete } = load('_features/my/hooks/use-my.ts', {
    '@/_constant/api-path': { apiPath: { reviews: 'reviews' } },
    '@/_features/review/constant/review.keys': { reviewKeys: { all: ['reviews'] } },
    '@/_lib/api/api': { api: { delete: async (url, config) => { requests.push({ url, config }); return { data: undefined }; } } },
    '@tanstack/react-query': {
      useMutation: (options) => options,
      useQueryClient: () => ({ invalidateQueries: (options) => { invalidations.push(options); return invalidated; } }),
    },
  });
  const options = useReviewDelete();
  assert.equal(options.retry, false);
  await options.mutationFn({ reviewId: 7 });
  assert.deepEqual(requests, [{ url: 'reviews/7', config: { signal: undefined } }]);
  assert.equal(options.onSuccess(), invalidated);
  assert.deepEqual(invalidations, [{ queryKey: ['reviews'] }]);
  finishInvalidation();
  await invalidated;
});

test('my reviews use a suspense query with page/category cache keys and cancellation', async () => {
  const response = pageData([], { page: 2, totalElements: 11, totalPages: 2 });
  const calls = [];
  const { useMyReviews } = load('_features/my/hooks/use-my.ts', {
    '@/_constant/api-path': { apiPath: { myReviews: '/my/reviews' } },
    '@/_features/review/constant/review.keys': { reviewKeys: { memberReviews: () => ['reviews', 'memberReviews'] } },
    '@/_lib/api/api': { api: { get: async (url, config) => { calls.push({ url, config }); return { data: response }; } } },
    '@tanstack/react-query': { useSuspenseQuery: (options) => options },
  });
  const params = { page: 2, size: 10, categoryId: 1 };
  const options = useMyReviews(params);
  assert.deepEqual(options.queryKey, ['reviews', 'memberReviews', params]);
  const signal = new AbortController().signal;
  assert.equal(await options.queryFn({ signal }), response);
  assert.deepEqual(calls, [{ url: '/my/reviews', config: { params, signal } }]);
  assert.notDeepEqual(options.queryKey, useMyReviews({ ...params, page: 1 }).queryKey);
});

test('only authenticated users mount the protected feed inside the shared query boundary', () => {
  let user = null;
  const routes = [];
  const Page = load('_features/my/components/mypage-content.tsx', {
    react: { useEffect: (effect) => effect() },
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useRouter: () => ({ replace: (route) => routes.push(route) }) },
    '@/_features/auth/hooks/use-auth': { useMe: () => ({ data: user, isPending: false }) },
    '@/_lib/auth-client': { getAuthErrorMessage: (error) => error.message },
    '@/_features/review/components/reviews-query-boundary': boundary,
    './my-reviews-feed': { __esModule: true, default: 'MyReviewsFeed' },
  }).default;
  assert.equal(findAll(Page(), (node) => node.type === 'MyReviewsFeed').length, 0);
  assert.deepEqual(routes, ['/login']);
  user = { nickname: '독자', email: 'reader@example.com' };
  const wrapper = findAll(Page(), (node) => node.type === 'ReviewsQueryBoundary')[0];
  assert.equal(wrapper.props.children.type, 'MyReviewsFeed');
});

test('feed uses the shared category hook and resets pagination when categories change', () => {
  let state = { page: 1 };
  const Feed = load('_features/my/components/my-reviews-feed.tsx', {
    react: { useState: () => [state, (next) => { state = next; }] },
    '@/_features/review/hooks/use-review': { useCategories: () => ({ data: [{ id: 2, category: '디지털' }] }) },
    '@/_features/review/components/reviews-query-boundary': boundary,
    './my-review-results': { __esModule: true, default: 'MyReviewResults' },
  }).default;
  const results = (tree) => findAll(tree, (node) => node.type === 'MyReviewResults')[0];
  results(Feed()).props.onPageChange(3);
  findAll(Feed(), (node) => node.type === 'button' && node.props.children === '디지털')[0].props.onClick();
  let tree = Feed();
  assert.deepEqual(results(tree).props.params, { page: 1, categoryId: 2, size: 10 });
  const wrapper = findAll(tree, (node) => node.type === 'ReviewsQueryBoundary')[0];
  assert.deepEqual(wrapper.props.resetKeys, [1, 2]);
  assert.equal(findAll(tree, (node) => node.type === 'input').length, 0);
  findAll(tree, (node) => node.type === 'button' && node.props.children === '필터 초기화')[0].props.onClick();
  assert.deepEqual(results(Feed()).props.params, { page: 1, size: 10 });
});

const resultsView = (data, params = { page: 1, size: 10 }) => {
  const pages = [];
  const routes = [];
  const corrections = [];
  let resets = 0;
  let selectedReview = null;
  let refCursor = 0;
  const refs = [];
  const deleteCalls = [];
  const mutation = {
    isPending: false,
    error: null,
    reset: () => { mutation.error = null; },
    mutate: (input, callbacks) => { deleteCalls.push({ input, callbacks }); mutation.isPending = true; },
  };
  const dialogCalls = [];
  const dialog = {
    showModal: () => dialogCalls.push('open'),
    close: () => dialogCalls.push('close'),
  };
  const Results = load('_features/my/components/my-review-results.tsx', {
    'next/navigation': { useRouter: () => ({ push: (url) => routes.push(url) }) },
    react: {
      useEffect: (effect) => effect(),
      useRef: (initial) => {
        const index = refCursor++;
        refs[index] ??= { current: index === 0 ? dialog : initial };
        return refs[index];
      },
      useState: () => [selectedReview, (next) => { selectedReview = next; }],
    },
    'next/link': { __esModule: true, default: 'a' },
    '../hooks/use-my': { useMyReviews: () => ({ data }), useReviewDelete: () => mutation },
    '@/_lib/auth-client': { getAuthErrorMessage: (error) => error.message },
    '@/_features/review/components/review-card': { __esModule: true, default: 'ReviewCard' },
    '@/_features/review/components/list/review-list-skeleton': { __esModule: true, default: 'ReviewListSkeleton' },
    '@/_features/review/components/list/review-pagination': { __esModule: true, default: 'ReviewPagination' },
  }).default;
  const render = () => {
    refCursor = 0;
    return Results({ params, onPageChange: (page) => pages.push(page), onPageCorrection: (page) => corrections.push(page), onReset: () => { resets++; } });
  };
  return { tree: render(), render, dialogCalls, dialog, mutation, deleteCalls, pages, routes, corrections, resetCount: () => resets };
};

test('server reviews pass compact management actions into each card without footer wrappers', () => {
  const reviews = [{ id: 1, title: '나의 리뷰' }, { id: 2, title: '다음 리뷰' }];
  const { tree, pages, routes } = resultsView(pageData(reviews, { totalElements: 25, totalPages: 3 }));
  const cards = findAll(tree, (node) => node.type === 'ReviewCard');
  assert.deepEqual(cards.map((card) => card.props.review), reviews);
  assert.equal(findAll(tree, (node) => node.props?.className === 'pb-5').length, 0);
  for (const card of cards) {
    const buttons = findAll(card.props.actions, (node) => node.type === 'button');
    assert.deepEqual(buttons.map((button) => button.props.children), ['수정', '삭제']);
    assert.ok(!buttons[0].props.disabled);
    buttons[0].props.onClick();
    assert.equal(routes.at(-1), `/reviews/edit/${card.props.review.id}`);
    assert.equal(buttons[1].props.disabled, false);
    assert.equal(buttons[1].props['aria-haspopup'], 'dialog');
  }
  const pagination = findAll(tree, (node) => node.type === 'ReviewPagination')[0];
  assert.equal(pagination.props.pageCount, 3);
  pagination.props.onPageChange(2);
  pagination.props.onPageChange(4);
  assert.deepEqual(pages, [2]);
});

test('delete opens a native modal for the selected review; cancel and backdrop close without deletion', () => {
  const reviews = [{ id: 1, title: '첫 번째 리뷰' }, { id: 2, title: '두 번째 리뷰' }];
  const view = resultsView(pageData(reviews));
  const cards = findAll(view.tree, (node) => node.type === 'ReviewCard');
  const deleteButton = findAll(cards[1].props.actions, (node) => node.type === 'button' && node.props.children === '삭제')[0];
  deleteButton.props.onClick();
  assert.deepEqual(view.dialogCalls, ['open']);
  let modal = findAll(view.render(), (node) => node.type === 'dialog')[0];
  assert.ok(JSON.stringify(modal.props.children).includes('두 번째 리뷰'));
  const buttons = findAll(modal, (node) => node.type === 'button');
  const confirm = buttons.find((button) => button.props.children === '삭제');
  assert.equal(confirm.props.disabled, false);
  assert.equal(typeof confirm.props.onClick, 'function');
  const cancel = buttons.find((button) => button.props.children === '취소');
  assert.equal(cancel.props.autoFocus, true);
  cancel.props.onClick();
  assert.deepEqual(view.dialogCalls, ['open', 'close']);
  deleteButton.props.onClick();
  modal = findAll(view.render(), (node) => node.type === 'dialog')[0];
  modal.props.onClick({ target: {}, currentTarget: view.dialog });
  assert.deepEqual(view.dialogCalls, ['open', 'close', 'open']);
  modal.props.onClick({ target: view.dialog, currentTarget: view.dialog });
  assert.deepEqual(view.dialogCalls, ['open', 'close', 'open', 'close']);
  assert.equal(findAll(view.render(), (node) => node.type === 'ReviewCard').length, 2);
  assert.equal(view.deleteCalls.length, 0);
});

test('confirm deletes the selected ID once, prevents dismissing in flight, and closes after success', () => {
  const view = resultsView(pageData([{ id: 7, title: '삭제할 리뷰' }]));
  const card = findAll(view.tree, (node) => node.type === 'ReviewCard')[0];
  findAll(card.props.actions, (node) => node.props?.children === '삭제')[0].props.onClick();
  const modal = () => findAll(view.render(), (node) => node.type === 'dialog')[0];
  const confirm = findAll(modal(), (node) => node.type === 'button' && node.props.children === '삭제')[0];
  confirm.props.onClick();
  confirm.props.onClick();
  assert.equal(view.deleteCalls.length, 1);
  assert.deepEqual(view.deleteCalls[0].input, { reviewId: 7 });
  const pendingModal = modal();
  assert.equal(pendingModal.props['aria-busy'], true);
  assert.ok(findAll(pendingModal, (node) => node.type === 'button').every((button) => button.props.disabled));
  let prevented = false;
  pendingModal.props.onCancel({ preventDefault: () => { prevented = true; } });
  pendingModal.props.onClick({ target: view.dialog, currentTarget: view.dialog });
  assert.equal(prevented, true);
  assert.deepEqual(view.dialogCalls, ['open']);
  view.deleteCalls[0].callbacks.onSuccess();
  view.deleteCalls[0].callbacks.onSettled();
  assert.deepEqual(view.dialogCalls, ['open', 'close']);
});

test('failed deletion keeps the dialog open, displays the error and allows retry', () => {
  const view = resultsView(pageData([{ id: 7, title: '삭제할 리뷰' }]));
  const card = findAll(view.tree, (node) => node.type === 'ReviewCard')[0];
  findAll(card.props.actions, (node) => node.props?.children === '삭제')[0].props.onClick();
  const confirm = () => findAll(findAll(view.render(), (node) => node.type === 'dialog')[0], (node) => node.type === 'button' && node.props.children === '삭제')[0];
  confirm().props.onClick();
  view.mutation.isPending = false;
  view.mutation.error = new Error('삭제 권한이 없습니다.');
  view.deleteCalls[0].callbacks.onSettled();
  const alert = findAll(view.render(), (node) => node.props?.role === 'alert')[0];
  assert.equal(alert.props.children, '삭제 권한이 없습니다.');
  assert.deepEqual(view.dialogCalls, ['open']);
  confirm().props.onClick();
  assert.equal(view.deleteCalls.length, 2);
});

test('empty categories can reset and pages beyond the server total are corrected', () => {
  const empty = resultsView(pageData([]));
  assert.equal(findAll(empty.tree, (node) => node.props?.href === '/reviews/new').length, 1);
  const filtered = resultsView(pageData([]), { page: 1, size: 10, categoryId: 2 });
  findAll(filtered.tree, (node) => node.type === 'button')[0].props.onClick();
  assert.equal(filtered.resetCount(), 1);
  const corrected = resultsView(pageData([], { page: 3, totalPages: 2 }), { page: 3, size: 10 });
  assert.deepEqual(corrected.corrections, [2]);
  assert.equal(corrected.tree.type, 'ReviewListSkeleton');
});
