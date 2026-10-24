import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import axios from 'axios';
import { QueryClient, QueryObserver, skipToken } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';

const requireDependency = createRequire(import.meta.url);
const load = (filename, overrides, transform = (source) => source) => {
  const source = ts.transpileModule(transform(fs.readFileSync(filename, 'utf8')), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText;
  const compiled = { exports: {} };
  const requireModule = (name) => overrides[name] ?? requireDependency(name);
  new Function('require', 'module', 'exports', source)(requireModule, compiled, compiled.exports);
  return compiled.exports;
};

test('Suspense queries reject missing endpoints and preserve request conditions and cache keys', async () => {
  const requests = [];
  const response = { content: [], page: 2, size: 3, totalElements: 4, totalPages: 2 };
  const api = axios.create({
    adapter: async (config) => {
      requests.push(config);
      return { data: response, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  const overrides = {
    '@tanstack/react-query': { useSuspenseQuery: (options) => options },
    '@/lib/api': { api },
  };
  const blank = load('app/_hooks/use-reviews.ts', overrides,
    (source) => source.replace("REVIEWS_API_URL: string = '/reviews'", "REVIEWS_API_URL: string = ''"));
  await assert.rejects(blank.useReviews({ page: 1, size: 3 }).queryFn(), /API 주소/);
  assert.equal(requests.length, 0);

  const configured = load('app/_hooks/use-reviews.ts', overrides);
  const params = { page: 2, size: 3, categoryId: 7, query: '의자', sort: 'rating' };
  const options = configured.useReviews(params);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  try {
    assert.deepEqual(await client.fetchQuery(options), response);
    assert.equal(requests[0].url, '/reviews');
    assert.deepEqual(requests[0].params, params);
    assert.equal(options.staleTime, 0);
    assert.equal(options.refetchOnMount, 'always');
    assert.equal(options.retry, false);
    assert.notDeepEqual(options.queryKey, configured.useReviews({ page: 1, size: 3 }).queryKey);
    assert.notDeepEqual(options.queryKey, configured.useReviews({ page: 2, size: 6 }).queryKey);
    for (const change of [{ categoryId: 8 }, { query: '책상' }, { sort: 'latest' }]) {
      assert.notDeepEqual(options.queryKey, configured.useReviews({ ...params, ...change }).queryKey);
    }
    api.defaults.adapter = async () => { throw new Error('Network unavailable'); };
    await assert.rejects(client.fetchQuery(configured.useReviews({ page: 3, size: 3 })), /Network unavailable/);
  } finally {
    client.clear();
  }
});

test('preserved search feed renders API reviews, filters and server page totals', () => {
  const review = {
    id: 42, title: '서버에서 받은 리뷰', category: { id: 1, category: '리빙' },
    rating: 4.5, createdAt: '2026-10-24T12:00:00', mainImageKey: null,
    author: { id: 7, nickname: '작성자' }, content: { type: 'doc', content: [] },
  };
  const Card = load('app/_components/review-card.tsx', {}).default;
  const Pagination = load('app/_components/review-pagination.tsx', {}).default;
  const Skeleton = load('app/_components/review-list-skeleton.tsx', {}).default;
  const Boundary = load('app/_components/reviews-query-boundary.tsx', {
    './review-list-skeleton': { default: Skeleton },
  }).default;
  let activeParams = { page: 1, size: 10, categoryId: 77, query: '다른 검색어', sort: 'latest' };
  let boundaryConfig;
  let requestedParams;
  const renderFeed = (result, categoryResult = { data: [{ id: 77, category: '서버 카테고리' }] }) => {
    const Feed = load('app/_components/review-search-feed.tsx', {
      '../_hooks/use-reviews': { useReviews: (params) => { requestedParams = params; return result; } },
      '../_hooks/use-categories': { useCategories: () => categoryResult },
      '../_hooks/use-review-search-params': {
        useReviewSearchParams: () => ({
          params: activeParams,
          updateParams: () => {},
        }),
      },
      './review-card': { default: Card },
      './review-pagination': { default: Pagination },
      './review-list-skeleton': { default: Skeleton },
      './reviews-query-boundary': { default: (props) => { boundaryConfig = props; return createElement(Boundary, props); } },
    }).default;
    return renderToStaticMarkup(createElement(Feed));
  };
  const secondReview = { ...review, id: 43, title: '두 번째 리뷰', rating: 5 };
  const html = renderFeed({ data: { content: [review, secondReview], page: 1, size: 3, totalElements: 4, totalPages: 2 } });
  assert.match(html, /서버에서 받은 리뷰/);
  assert.match(html, /작성자/);
  assert.match(html, /2026\.10\.24/);
  assert.match(html, /aria-label="2페이지"/);
  assert.doesNotMatch(html, /소니|조회순/);
  assert.ok(html.indexOf('서버에서 받은 리뷰') < html.indexOf('두 번째 리뷰'));
  assert.match(html, /aria-pressed="true"[^>]*>서버 카테고리/);
  assert.match(html, /name="query"/);
  assert.deepEqual(boundaryConfig.resetKeys, [1, 10, 77, '다른 검색어', 'latest']);
  assert.equal(boundaryConfig.skeletonCount, 10);
  const result = { data: { content: [review], page: 1, size: 3, totalElements: 1, totalPages: 1 } };
  assert.match(renderFeed(result, { isLoading: true }), /카테고리를 불러오는 중/);
  assert.match(renderFeed(result, { isError: true }), /카테고리 다시 시도/);
  assert.match(renderFeed(result, { data: [] }), /등록된 카테고리가 없습니다/);
  assert.match(renderFeed({ data: { content: [], page: 1, size: 3, totalElements: 0, totalPages: 0 } }), /일치하는 리뷰가 없어요/);
  activeParams = { page: 2, size: 10, categoryId: 8, query: '새 조건', sort: 'latest' };
  assert.match(renderFeed({ data: { ...result.data, totalPages: 2 } }), /서버에서 받은 리뷰/);
  assert.deepEqual(requestedParams, activeParams);
  assert.deepEqual(boundaryConfig.resetKeys, [2, 10, 8, '새 조건', 'latest']);
  assert.equal(boundaryConfig.skeletonCount, 10);
  activeParams = { page: 1, size: 10, categoryId: undefined, query: undefined, sort: 'latest' };
  const empty = renderFeed({ data: { content: [], totalElements: 0, totalPages: 0, size: 10 } });
  assert.match(empty, /아직 등록된 리뷰가 없습니다/);
  assert.doesNotMatch(empty, /검색·카테고리 초기화/);
});

test('list URL changes discard size and sort while preserving search, category and unrelated values', () => {
  const { createReviewListHref } = load('app/_hooks/use-review-search-params.ts', {});
  const search = new URLSearchParams('page=2&size=1&sort=rating&query=의자&categoryId=3&keep=yes');
  const next = new URL(createReviewListHref('/reviews', search, { page: 3 }, '#reviews'), 'http://localhost');
  assert.equal(next.pathname, '/reviews');
  assert.equal(next.searchParams.get('page'), '3');
  assert.equal(next.searchParams.get('query'), '의자');
  assert.equal(next.searchParams.get('categoryId'), '3');
  assert.equal(next.searchParams.get('keep'), 'yes');
  assert.equal(next.searchParams.has('size'), false);
  assert.equal(next.searchParams.has('sort'), false);
  assert.equal(next.hash, '#reviews');
  const filtered = new URL(createReviewListHref('/reviews', search, { categoryId: 8 }, ''), 'http://localhost');
  assert.equal(filtered.searchParams.get('page'), '1');
  assert.equal(createReviewListHref('/reviews', search, { query: '의자' }, ''), null);
});

test('pagination limits visible page numbers for small, middle and edge pages', () => {
  const { getPaginationItems, default: Pagination } = load('app/_components/review-pagination.tsx', {});
  assert.deepEqual(getPaginationItems(1, 1), [1]);
  assert.deepEqual(getPaginationItems(1, 100), [1, 2, 3, 'gap-3', 100]);
  assert.deepEqual(getPaginationItems(50, 100), [1, 'gap-1', 48, 49, 50, 51, 52, 'gap-52', 100]);
  assert.deepEqual(getPaginationItems(100, 100), [1, 'gap-1', 98, 99, 100]);
  assert.deepEqual(getPaginationItems(1, 0), []);
  const html = renderToStaticMarkup(createElement(Pagination, { page: 50, pageCount: 100, onPageChange: () => {} }));
  assert.match(html, /aria-current="page"/);
  assert.equal((html.match(/<button\b/g) ?? []).length, 9);
});

test('home requests five latest reviews and renders returned counts with default images', () => {
  const homeReviews = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    title: `테스트 리뷰 ${index + 1}`,
    rating: 4.5,
    createdAt: '2026-10-24T09:00:00+09:00',
    category: { id: 1, category: '리빙' },
    author: { id: index + 1, nickname: '테스트 작성자' },
    mainImageKey: null,
    content: { type: 'doc', content: [] },
  }));
  const Card = load('app/_components/review-card.tsx', {}).default;
  let request;
  let reviews = homeReviews.slice(0, 5);
  const List = load('app/_components/review-feed-list.tsx', {
    '../_hooks/use-reviews': { useReviews: (params) => { request = params; return { data: { content: reviews } }; } },
    './review-card': { default: Card },
  }).default;
  for (const count of [5, 2, 0]) {
    reviews = homeReviews.slice(0, count);
    const html = renderToStaticMarkup(createElement(List));
    assert.deepEqual(request, { page: 1, size: 5, sort: 'latest' });
    assert.equal((html.match(/<article\b/g) ?? []).length, count);
    assert.equal((html.match(/alt="대표 이미지 없음"/g) ?? []).length, count);
    assert.doesNotMatch(html, /<form\b|<select\b|카테고리 필터|리뷰 페이지 이동/);
    if (count === 0) assert.match(html, /아직 등록된 리뷰가 없습니다/);
  }
  for (const imageSrc of [undefined, '']) {
    const html = renderToStaticMarkup(createElement(Card, { review: homeReviews[0], imageSrc }));
    assert.match(html, /src="\/reviews\/no-image.svg"/);
  }
  assert.ok(fs.existsSync('public/reviews/no-image.svg'));
  const real = renderToStaticMarkup(createElement(Card, { review: homeReviews[0], imageSrc: '/reviews/headphones.svg' }));
  assert.match(real, /src="\/reviews\/headphones.svg"/);
  const Skeleton = load('app/_components/review-list-skeleton.tsx', {}).default;
  const loading = renderToStaticMarkup(createElement(Skeleton, { count: 5 }));
  assert.equal((loading.match(/data-review-skeleton/g) ?? []).length, 5);
  assert.match(loading, /aria-busy="true"/);
});

test('reviews refetch on observer mount while retaining cached data after background failure', async () => {
  const data = { content: [], page: 1, size: 5, totalElements: 0, totalPages: 0 };
  let fail = false;
  let requests = 0;
  const api = { get: async () => { requests++; if (fail) throw new Error('Offline'); return { data }; } };
  const { useReviews } = load('app/_hooks/use-reviews.ts', {
    '@tanstack/react-query': { useSuspenseQuery: (options) => options }, '@/lib/api': { api },
  });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const options = useReviews({ page: 1, size: 5 });
  await client.fetchQuery(options);
  fail = true;
  const observer = new QueryObserver(client, options);
  assert.deepEqual(observer.getCurrentResult().data, data);
  let unsubscribe = () => {};
  try {
    await new Promise((resolve) => { unsubscribe = observer.subscribe((result) => { if (result.isError && !result.isFetching) resolve(); }); });
    assert.equal(requests, 2);
    assert.deepEqual(observer.getCurrentResult().data, data);
  } finally {
    unsubscribe(); client.clear();
  }
});

test('categories use their own endpoint and forward cancellation independently of reviews', async () => {
  const requests = [];
  const result = [{ id: 7, category: '리빙' }];
  const api = axios.create({
    adapter: async (config) => {
      requests.push(config);
      return { data: result, status: 200, statusText: 'OK', headers: {}, config };
    },
  });
  const { useCategories } = load('app/_hooks/use-categories.ts', {
    '@tanstack/react-query': { skipToken, useQuery: (options) => options },
    '../_constant/query-keys': { categoryKeys: { list: 'categories' } },
    '../_constant/api-path': { apiPathCategory: { list: 'categories' } },
    '@/lib/api': { api },
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await useCategories().queryFn({ signal }), result);
  assert.equal(requests[0].url, 'categories');
  assert.equal(requests[0].signal, signal);
});

test('URL parsing validates positive safe integers and defaults', () => {
  const { parseReviewSearchParams } = load('app/_hooks/use-review-search-params.ts', {});
  const defaults = { page: 1, size: 10, categoryId: undefined, query: undefined, sort: 'latest' };
  assert.deepEqual(parseReviewSearchParams(new URLSearchParams()), defaults);
  for (const invalid of ['0', '-1', '1.5', '1e2', '0x10', 'NaN', 'Infinity', '9007199254740992', ' 2 ', '']) {
    const params = new URLSearchParams({ page: invalid, size: invalid, categoryId: invalid, sort: 'invalid', query: '  ' });
    assert.deepEqual(parseReviewSearchParams(params), defaults);
  }
  assert.deepEqual(parseReviewSearchParams(new URLSearchParams('page=2&size=20&categoryId=77&query=의자&sort=rating')),
    { page: 2, size: 20, categoryId: 77, query: '의자', sort: 'rating' });
});

test('URL changes preserve unrelated data, reset page for filters and skip unchanged conditions', () => {
  const { createReviewSearchHref } = load('app/_hooks/use-review-search-params.ts', {});
  const search = new URLSearchParams('page=3&size=20&categoryId=77&query=의자&sort=rating&utm=keep');
  const href = (updates) => createReviewSearchHref('/', search, updates, '#reviews');
  assert.equal(href({ page: 3 }), null);
  assert.equal(href({ query: ' 의자 ' }), null);
  const pageUrl = new URL(href({ page: 4 }), 'http://localhost');
  assert.equal(pageUrl.hash, '#reviews');
  assert.equal(pageUrl.searchParams.get('page'), '4');
  assert.equal(pageUrl.searchParams.get('categoryId'), '77');
  assert.equal(pageUrl.searchParams.get('query'), '의자');
  assert.equal(pageUrl.searchParams.get('utm'), 'keep');
  for (const update of [{ query: '책상' }, { categoryId: 8 }, { sort: 'latest' }, { size: 10 }]) {
    assert.equal(new URL(href(update), 'http://localhost').searchParams.get('page'), '1');
  }
  const reset = new URL(href({ query: undefined, categoryId: undefined, page: 1 }), 'http://localhost');
  assert.equal(reset.searchParams.has('query'), false);
  assert.equal(reset.searchParams.has('categoryId'), false);
  assert.equal(reset.searchParams.get('size'), '20');
  assert.equal(reset.searchParams.get('sort'), 'rating');
});
