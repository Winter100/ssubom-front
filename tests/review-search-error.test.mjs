import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, dependencies) => {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  return compiled.exports.default;
};

test('search wraps the entire feed, including category queries, in an error and suspense boundary', () => {
  let options;
  const Client = load('_features/review/components/review-search-client.tsx', {
    'next/dynamic': { default: (_loader, config) => { options = config; return 'SearchFeed'; } },
    './list/review-list-skeleton': { default: 'Skeleton' },
    './reviews-query-boundary': { default: 'QueryBoundary' },
  });
  const tree = Client();
  assert.equal(tree.type, 'QueryBoundary');
  assert.equal(tree.props.skeletonCount, 10);
  assert.equal(tree.props.children.type, 'SearchFeed');
  assert.equal(options.ssr, false);
});

test('server and network errors show the shared retry notice and reset query errors', () => {
  class ApiError extends Error {}
  const Boundary = load('_features/review/components/reviews-query-boundary.tsx', {
    '@tanstack/react-query': { QueryErrorResetBoundary: 'QueryResetBoundary' },
    'react-error-boundary': { ErrorBoundary: 'ErrorBoundary' },
    './list/review-list-skeleton': { default: 'Skeleton' },
    'next/navigation': { notFound: () => assert.fail('list errors must not navigate to 404') },
    '@/_lib/api/api': { ApiError },
  });
  let resets = 0;
  const wrapper = Boundary({ children: 'Feed', skeletonCount: 10 });
  const errorBoundary = wrapper.props.children({ reset: () => { resets++; } });
  for (const error of [Object.assign(new ApiError('Server failed'), { status: 500 }), new Error('Network failed')]) {
    let retries = 0;
    const fallback = errorBoundary.props.fallbackRender({ error, resetErrorBoundary: () => { retries++; } });
    assert.equal(fallback.props.role, 'alert');
    assert.equal(fallback.props.children[0].props.children, '리뷰를 불러오지 못했습니다.');
    fallback.props.children[1].props.onClick();
    assert.equal(retries, 1);
  }
  errorBoundary.props.onReset();
  assert.equal(resets, 1);
});
