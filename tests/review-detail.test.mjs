import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import ts from 'typescript';
import StarterKit from '@tiptap/starter-kit';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';

const require = createRequire(import.meta.url);
const load = (path, overrides = {}) => {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (name) => overrides[name] ?? require(name), loadedModule, loadedModule.exports,
  );
  return loadedModule.exports.default ?? loadedModule.exports;
};

test('detail boundary sends only API 404 errors to not-found and preserves retries for other errors', () => {
  class ApiError extends Error {
    constructor(status) {
      super('API error');
      this.status = status;
    }
  }
  const Boundary = load('_features/review/components/reviews-query-boundary.tsx', {
    '@/_lib/api/api': { ApiError },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    './review-list-skeleton': { default: 'skeleton' },
  });
  const fallbackOf = (props) => Boundary(props).props.children({ reset: () => {} }).props.fallbackRender;
  const detailFallback = fallbackOf({ notFoundOn404: true });
  assert.throws(() => detailFallback({ error: new ApiError(404) }), /NOT_FOUND/);
  for (const error of [new ApiError(500), new ApiError(null), new Error('network')]) {
    let retried = false;
    const fallback = detailFallback({ error, resetErrorBoundary: () => { retried = true; } });
    assert.equal(fallback.props.role, 'alert');
    fallback.props.children[1].props.onClick();
    assert.equal(retried, true);
  }
  assert.equal(fallbackOf({})({ error: new ApiError(404) }).props.role, 'alert');
});

test('not-found page offers review list and home links', () => {
  const NotFound = load('app/(route)/reviews/[id]/not-found.tsx');
  const html = renderToStaticMarkup(createElement(NotFound));
  assert.match(html, /404/);
  assert.match(html, /<h1[^>]*>리뷰를 찾을 수 없어요<\/h1>/);
  assert.match(html, /href="\/reviews"/);
  assert.match(html, /href="\/"/);
});

test('back button returns to history or falls back to the review list', () => {
  const calls = [];
  const BackButton = load('_features/review/components/review-back-button.tsx', {
    'next/navigation': { useRouter: () => ({
      back: () => calls.push('back'),
      replace: (href) => calls.push(href),
    }) },
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const length of [2, 1]) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true, value: { history: { length } },
      });
      BackButton().props.onClick();
    }
    assert.deepEqual(calls, ['back', '/reviews']);
    assert.match(renderToStaticMarkup(createElement(BackButton)), /뒤로 가기/);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});

test('detail API blocks malformed IDs before sending a request', async () => {
  const idValidation = load('_features/review/lib/review-id.ts');
  const requests = [];
  const { getDetailReview } = load('_lib/api/get-api.ts', {
    '@/_constant/api-path': { apiPath: { reviews: '/reviews' } },
    '@/_features/review/lib/review-id': idValidation,
    './api': { api: { get: async (url) => {
      requests.push(url);
      return { data: { id: 42 } };
    } } },
  });
  for (const id of [undefined, null, ['42'], '', 'undefined', 'new', '%%drp:id:123%%', '0', '-1', '1.5', ' 42 ', '1/2', '9223372036854775808']) {
    await assert.rejects(getDetailReview(id), /올바른 리뷰 ID/);
  }
  assert.deepEqual(requests, []);
  assert.deepEqual(await getDetailReview('42'), { id: 42 });
  await getDetailReview('9223372036854775807');
  assert.deepEqual(requests, ['/reviews/42', '/reviews/9223372036854775807']);
});

test('detail page awaits route params and rejects invalid routes before rendering the query', async () => {
  const Page = load('app/(route)/reviews/[id]/page.tsx', {
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
    '@/_features/review/lib/review-id': load('_features/review/lib/review-id.ts'),
    '@/_features/review/components/reviews-query-boundary': { default: 'boundary' },
    '@/_features/review/components/review-detail-container': { default: 'detail' },
    '@/_features/review/components/review-detail-skeleton': { default: 'skeleton' },
  });
  const contentOf = (params) => Page({ params }).props.children.props.children.props.children;
  let resolveParams;
  const params = new Promise((resolve) => { resolveParams = resolve; });
  const content = contentOf(params);
  let completed = false;
  const result = content.type(content.props).then((element) => { completed = true; return element; });
  await Promise.resolve();
  assert.equal(completed, false);
  resolveParams({ id: '42' });
  assert.equal((await result).props.id, '42');
  const invalid = contentOf(Promise.resolve({ id: 'undefined' }));
  await assert.rejects(invalid.type(invalid.props), /NOT_FOUND/);
});

test('detail renders response fields and retains cards for missing or blank values', () => {
  const review = {
    title: '직접 사용한 리뷰', category: { category: '전자제품' },
    author: { nickname: '작성자' }, createdAt: '2026-10-28T10:00:00',
    rating: 4.5, duration: '두 달', content: { type: 'doc' },
    pros: ['편리해요'], cons: ['무거워요'], verdict: '매일 쓰는 분',
  };
  const Detail = load('_features/review/components/review-detail-container.tsx', {
    'next/navigation': { useParams: () => ({ id: '42' }) },
    '../hooks/use-review': { useDetailReview: (id) => {
      assert.equal(id, '42');
      return { data: review };
    } },
    '../lib/editor-config': { createExtensions: () => [], richTextClasses: '' },
    '@tiptap/static-renderer/pm/react': { renderToReactElement: ({ content }) => {
      assert.equal(content, review.content);
      return createElement('p', null, '본문 내용');
    } },
  });
  const html = renderToStaticMarkup(createElement(Detail, { id: '42' }));
  assert.match(html, /aria-label="리뷰 바로가기"/);
  for (const target of ['review-story', 'review-points', 'review-verdict']) {
    assert.ok(html.includes(`href="#${target}"`));
    assert.ok(html.includes(`id="${target}"`));
  }
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  const aside = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'));
  for (const title of ['어떤 상품을 써보셨나요?', '대표 이미지', '진짜 써본 이야기', '이런 분께 추천해요']) {
    assert.ok(html.includes(title), title);
  }
  for (const label of ['01 · THE BASICS', '02 · THE FIRST IMPRESSION', '03 · YOUR HONEST STORY', 'MY FINAL THOUGHTS']) {
    assert.ok(html.includes(label), label);
  }
  assert.doesNotMatch(aside, /직접 사용한 리뷰|2026\.10\.28/);
  for (const text of ['직접 사용한 리뷰', '작성자', '2026.10.28']) {
    assert.ok(header.includes(text), text);
  }
  for (const text of ['직접 사용한 리뷰', '전자제품', '작성자', '2026.10.28', '4.5', '두 달', '본문 내용', '편리해요', '무거워요', '매일 쓰는 분']) {
    assert.ok(html.includes(text), text);
  }
  delete review.pros;
  delete review.cons;
  delete review.verdict;
  for (const values of [
    {},
    { pros: [], cons: [], verdict: '', duration: '' },
    { pros: [' ', '\n'], cons: ['\t'], verdict: '  ', duration: ' ' },
  ]) {
    Object.assign(review, values);
    const empty = renderToStaticMarkup(createElement(Detail, { id: '42' }));
    for (const text of ['이런 점이 좋았어요', '이런 점은 아쉬웠어요', 'MY FINAL THOUGHTS', '등록된 장점이 없습니다.', '등록된 단점이 없습니다.', '등록된 추천 내용이 없습니다.', 'REVIEW AT A GLANCE']) {
      assert.ok(empty.includes(text), text);
    }
    if ('duration' in values) assert.match(empty, /등록된 사용 기간이 없습니다/);
  }
});

test('detail skeleton exposes an accessible loading status', () => {
  const Skeleton = load('_features/review/components/review-detail-skeleton.tsx');
  const html = renderToStaticMarkup(createElement(Skeleton));
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /리뷰 상세를 불러오는 중입니다/);
});

test('submission trims pros and cons without changing the original input or inner spaces', async () => {
  let payload;
  const { createReview } = load('_features/review/lib/review-submission.ts', {
    './local-images': {
      getImageSources: () => [],
      replaceImageSources: (body) => body,
    },
    './review-validation': { hasRequiredReviewFields: () => true },
    './review-limits': { countBodyImages: () => 0, MAX_BODY_IMAGES: 10, MAX_VERDICT_LENGTH: 500 },
    './review-api': { postReview: async (request) => { payload = request; } },
  });
  const review = {
    category: { id: 1 }, image: '', body: { type: 'doc' }, verdict: '',
    pros: ['  사용이 편해요  ', '\t두  번째 장점\n', '   '],
    cons: ['\n 무거워요 \t', ' 두 번째 단점 '],
  };
  const original = structuredClone(review);
  await createReview(review, new Map());
  assert.deepEqual(payload.pros, ['사용이 편해요', '두  번째 장점', '']);
  assert.deepEqual(payload.cons, ['무거워요', '두 번째 단점']);
  assert.deepEqual(review, original);
});

test('detail retains consecutive empty paragraphs and hard breaks with visible blank-line styles', () => {
  const content = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '첫 문단' }] },
      { type: 'paragraph' },
      { type: 'paragraph' },
      { type: 'paragraph', content: [
        { type: 'text', text: '다음 문단' },
        { type: 'hardBreak' },
        { type: 'hardBreak' },
        { type: 'text', text: '줄바꿈 뒤' },
      ] },
    ],
  };
  const Detail = load('_features/review/components/review-detail-container.tsx', {
    'next/navigation': { useParams: () => ({ id: '42' }) },
    '../hooks/use-review': { useDetailReview: () => ({ data: {
      title: '줄바꿈 리뷰', category: { category: '리빙' },
      author: { nickname: '작성자' }, createdAt: '2026-10-28', rating: 4,
      content,
    } }) },
    '../lib/editor-config': {
      createExtensions: () => [StarterKit], richTextClasses: '',
    },
    '@tiptap/static-renderer/pm/react': { renderToReactElement },
  });
  const html = renderToStaticMarkup(createElement(Detail, { id: '42' }));
  assert.match(html, /<p>첫 문단<\/p><p><\/p><p><\/p><p>다음 문단<br\/><br\/>줄바꿈 뒤<\/p>/);
  assert.ok(html.includes('[&amp;_p:empty]:min-h-lh'));
  assert.ok(html.includes('[&amp;_p]:whitespace-pre-wrap'));
});
