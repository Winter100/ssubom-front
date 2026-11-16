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
  return compiled.exports.default;
};

test('edit redirects forbidden reads to mypage while preserving 404 and other error handling', () => {
  class ApiError extends Error {
    constructor(status) { super('failed'); this.status = status; }
  }
  const routes = [];
  let notFoundCalls = 0;
  const Boundary = load('_features/review/components/reviews-query-boundary.tsx', {
    react: { useEffect: (effect) => effect(), Suspense: 'Suspense' },
    'next/navigation': { useRouter: () => ({ replace: (href) => routes.push(href) }), notFound: () => { notFoundCalls++; } },
    '@tanstack/react-query': { QueryErrorResetBoundary: 'QueryErrorResetBoundary' },
    'react-error-boundary': { ErrorBoundary: 'ErrorBoundary' },
    './list/review-list-skeleton': { __esModule: true, default: 'Skeleton' },
    '@/_lib/api/api': { ApiError },
  });
  const props = { forbiddenRedirectTo: '/mypage', notFoundOn404: true };
  const fallback = Boundary(props).props.children({ reset: () => {} }).props.fallbackRender;
  const forbidden = fallback({ error: new ApiError(403) });
  forbidden.type(forbidden.props);
  assert.deepEqual(routes, ['/mypage']);
  fallback({ error: new ApiError(404) });
  assert.equal(notFoundCalls, 1);
  assert.equal(fallback({ error: new ApiError(500) }).props.role, 'alert');
  assert.equal(fallback({ error: new Error('network') }).props.role, 'alert');
  const defaultFallback = Boundary({}).props.children({ reset: () => {} }).props.fallbackRender;
  assert.equal(defaultFallback({ error: new ApiError(403) }).props.role, 'alert');
  const Page = load('app/(route)/reviews/edit/[id]/page.tsx', {
    '@/_features/review/components/reviews-query-boundary': { __esModule: true, default: 'Boundary' },
    '@/_features/review/lib/review-id': { isValidReviewId: () => true },
    'next/navigation': { notFound: () => {} },
    './review-edit-content': { __esModule: true, default: 'Content' },
  });
  assert.equal(Page({ params: Promise.resolve({ id: '1' }) }).props.forbiddenRedirectTo, '/mypage');
});
