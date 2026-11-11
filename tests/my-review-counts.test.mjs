import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const dependency = createRequire(import.meta.url);
const load = (file, overrides = {}) => {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

test('member category counts call the backend route with cancellation and share review invalidation', async () => {
  const { apiPath } = load('_constant/api-path.ts');
  const { reviewKeys } = load('_features/review/constant/review.keys.ts');
  const counts = [{ categoryId: 2, category: '디지털', count: 1234 }];
  const requests = [];
  const { useMyReviewCounts } = load('_features/my/hooks/use-my.ts', {
    '@/_constant/api-path': { apiPath },
    '@/_features/review/constant/review.keys': { reviewKeys },
    '@/_lib/api/api': { api: { get: async (url, config) => { requests.push({ url, config }); return { data: counts }; } } },
    '@tanstack/react-query': { useQuery: (options) => options },
  });
  const query = useMyReviewCounts();
  const signal = new AbortController().signal;
  assert.equal(await query.queryFn({ signal }), counts);
  assert.deepEqual(requests, [{ url: 'member/count', config: { signal } }]);
  assert.deepEqual(query.queryKey, [...reviewKeys.all, 'memberReviewCounts']);
});

test('category counts render the response, loading, error and empty states', () => {
  let state = { data: [{ categoryId: 2, category: '디지털', count: 1234 }, { categoryId: 3, category: '뷰티', count: 0 }], isPending: false, isError: false };
  const Counts = load('_features/my/components/my-review-counts.tsx', {
    '../hooks/use-my': { useMyReviewCounts: () => state },
    '@/_features/review/components/category-label': { __esModule: true, default: ({ category }) => createElement('span', null, category) },
  }).default;
  const render = () => renderToStaticMarkup(createElement(Counts, { onCategoryChange: () => {}, onReset: () => {} }));
  const findAll = (node, predicate) => {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate));
    return [...(predicate(node) ? [node] : []), ...findAll(node.props?.children, predicate)];
  };
  const selections = [];
  let resets = 0;
  const tree = Counts({ categoryId: 2, onCategoryChange: (id) => selections.push(id), onReset: () => { resets++; } });
  const filters = findAll(tree, (node) => node.type === 'button' && 'aria-pressed' in node.props);
  assert.equal(filters.length, 3);
  assert.deepEqual(filters.map((node) => node.props['aria-pressed']), [false, true, false]);
  assert.match(filters[1].props.className, /bg-\[#6aaa88\]/);
  filters[0].props.onClick();
  filters[2].props.onClick();
  assert.deepEqual(selections, [undefined, 3]);
  findAll(tree, (node) => node.props?.['aria-label'] === '내 리뷰 필터 초기화')[0].props.onClick();
  assert.equal(resets, 1);
  assert.match(render(), /디지털/);
  assert.match(render(), /1,234개/);
  assert.match(render(), /뷰티/);
  assert.match(render(), /0개/);
  state = { isPending: true };
  assert.match(render(), /role="status"/);
  state = { isError: true };
  assert.match(render(), /다시 시도/);
  assert.match(render(), /role="alert"/);
  state = { data: [] };
  assert.match(render(), /전체/);
  assert.match(render(), /0개/);
});
