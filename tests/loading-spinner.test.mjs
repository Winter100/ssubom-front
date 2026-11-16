import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, overrides = {}) => {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const result = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (name) => overrides[name] ?? (name.endsWith('.css') ? {} : require(name)), result, result.exports,
  );
  return result.exports.default;
};
const Spinner = load('_features/common/components/loading-spinner.tsx');

test('spinner exposes accessible status without visible loading text', () => {
  const html = renderToStaticMarkup(createElement(Spinner));
  assert.match(html, /data-loading-spinner/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-label="불러오는 중"/);
  assert.match(html, /class="loading-spinner"/);
  assert.ok(!html.includes('>불러오는 중'));
});

test('mypage replaces initial loading text and shows content when authentication resolves', () => {
  let state = { data: null, isPending: true, isFetching: true };
  const Page = load('_features/my/components/mypage-content.tsx', {
    'next/navigation': { useRouter: () => ({ replace: () => {} }) },
    '@/_features/auth/hooks/use-auth': { useMe: () => state },
    '@/_lib/auth-client': { getAuthErrorMessage: () => '조회 오류' },
    '@/_features/review/components/reviews-query-boundary': { default: ({ children }) => children },
    './my-reviews-feed': { default: () => null },
    './my-review-counts': { default: () => null },
    './profile-image-form': { default: () => null },
    './withdrawal-section': { default: () => null },
    '@/_features/auth/components/login-link': { default: 'a' },
    '@/_features/auth/lib/login-redirect': { getLoginHref: () => '/login' },
    '@/_features/review/components/list/review-grid-skeleton': { default: Spinner },
    '@/_features/common/components/loading-spinner': { default: Spinner },
  });
  const waiting = renderToStaticMarkup(createElement(Page));
  assert.match(waiting, /data-loading-spinner/);
  assert.ok(!waiting.includes('로그인 상태를 확인'));
  state = {
    data: { id: 1, nickname: '사용자', email: 'test@example.com', createdAt: '2026-11-01T00:00:00Z' },
    isPending: false, isFetching: false,
  };
  const loaded = renderToStaticMarkup(createElement(Page));
  assert.match(loaded, /mypage-title/);
  assert.ok(!loaded.includes('data-loading-spinner'));
  state = { ...state, isFetching: true };
  const refreshing = renderToStaticMarkup(createElement(Page));
  assert.ok(!refreshing.includes('data-loading-spinner'));
  state = { data: null, error: new Error('조회 오류'), isPending: false, isFetching: false };
  const failed = renderToStaticMarkup(createElement(Page));
  assert.match(failed, /role="alert"/);
  assert.ok(!failed.includes('data-loading-spinner'));
});

test('existing review skeletons do not render a spinner', () => {
  for (const path of [
    '_features/review/components/list/review-list-skeleton.tsx',
    '_features/review/components/list/review-grid-skeleton.tsx',
    '_features/review/components/detail/review-detail-skeleton.tsx',
  ]) {
    const Skeleton = load(path);
    const html = renderToStaticMarkup(createElement(Skeleton, { count: 2 }));
    assert.match(html, /animate-pulse/);
    assert.ok(!html.includes('data-loading-spinner'));
  }
});
