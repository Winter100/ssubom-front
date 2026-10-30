import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const load = (path, overrides = {}) => {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

test('search target defaults to title, resets pagination on change and persists across pages', () => {
  const { parseReviewSearchParams, createReviewListHref } = load(
    '_features/review/hooks/use-review-search-params.ts', { 'next/navigation': {} },
  );
  for (const raw of ['', 'searchType=invalid']) {
    assert.equal(parseReviewSearchParams(new URLSearchParams(raw)).searchType, 'title');
  }
  const changed = createReviewListHref('/reviews', new URLSearchParams('page=3&query=독자'), { searchType: 'author' }, '');
  const params = new URL(changed, 'http://localhost').searchParams;
  assert.equal(params.get('page'), '1');
  assert.equal(params.get('query'), '독자');
  assert.equal(params.get('searchType'), 'author');
  const next = createReviewListHref('/reviews', params, { page: 2 }, '');
  assert.equal(new URL(next, 'http://localhost').searchParams.get('searchType'), 'author');
});

test('search target is submitted with the keyword from the left-hand select', () => {
  const updates = [];
  const Feed = load('_features/review/components/review-search-feed.tsx', {
    react: { useRef: () => ({ current: null }), useEffect: () => {} },
    '../hooks/use-review-search-params': { useReviewSearchParams: () => ({
      params: { page: 1, size: 10, sort: 'latest', searchType: 'author' },
      updateParams: (value) => updates.push(value),
    }) },
    '../hooks/use-review': { useCategories: () => ({ data: [] }) },
    ...Object.fromEntries(['./review-card', './list/review-pagination', './reviews-query-boundary', './list/review-list-skeleton']
      .map((name) => [name, { default: 'section' }])),
  }).default;
  const form = Feed().props.children[0];
  const select = form.props.children[0].props.children[1];
  assert.equal(select.type, 'select');
  assert.equal(select.props.defaultValue, 'author');
  assert.deepEqual(select.props.children.map((option) => option.props.value), ['title', 'author']);
  const OriginalFormData = globalThis.FormData;
  try {
    globalThis.FormData = Map;
    form.props.onSubmit({ preventDefault: () => {}, currentTarget: [['query', '독자'], ['searchType', 'author']] });
    assert.deepEqual(updates, [{ query: '독자', searchType: 'author' }]);
  } finally {
    globalThis.FormData = OriginalFormData;
  }
});

test('reset clears applied filters and unsent form values even when URL defaults are unchanged', () => {
  const updates = [];
  const input = { value: '아직 검색하지 않은 내용' };
  const select = { value: 'author' };
  const Feed = load('_features/review/components/review-search-feed.tsx', {
    react: { useRef: () => ({ current: {
      querySelector: (selector) => selector === '[name="query"]' ? input : select,
    } }), useEffect: () => {} },
    '../hooks/use-review-search-params': { useReviewSearchParams: () => ({
      params: { page: 1, size: 10, sort: 'latest', searchType: 'title' },
      updateParams: (value) => updates.push(value),
    }) },
    '../hooks/use-review': { useCategories: () => ({ data: [] }) },
    ...Object.fromEntries(['./review-card', './list/review-pagination', './reviews-query-boundary', './list/review-list-skeleton']
      .map((name) => [name, { default: 'section' }])),
  }).default;
  const tree = Feed();
  const button = tree.props.children[1].props.children[1];
  assert.equal(button.props.children, '필터 초기화');
  button.props.onClick();
  assert.equal(input.value, '');
  assert.equal(select.value, 'title');
  assert.deepEqual(updates, [{ query: undefined, searchType: 'title', categoryId: undefined, page: 1 }]);
  assert.equal(tree.props.children[2].props.children.props.onReset, button.props.onClick);
  const { createReviewListHref, parseReviewSearchParams } = load(
    '_features/review/hooks/use-review-search-params.ts', { 'next/navigation': {} },
  );
  const href = createReviewListHref('/reviews', new URLSearchParams('query=독자&searchType=author&categoryId=3&page=4'), updates[0], '');
  const params = parseReviewSearchParams(new URL(href, 'http://localhost').searchParams);
  assert.equal(params.query, undefined);
  assert.equal(params.categoryId, undefined);
  assert.equal(params.searchType, 'title');
  assert.equal(params.page, 1);
});
