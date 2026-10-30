import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { QueryClient, QueryObserver, focusManager, onlineManager } from '@tanstack/react-query';
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

test('list and detail data components both disable server rendering', () => {
  for (const [path, skeleton] of [
    ['_features/review/components/review-search-client.tsx', './list/review-list-skeleton'],
    ['_features/review/components/detail/review-detail-client.tsx', './review-detail-skeleton'],
  ]) {
    let options;
    load(path, {
      'next/dynamic': { default: (_, config) => { options = config; return 'client'; } },
      [skeleton]: { default: 'skeleton' },
    });
    assert.equal(options.ssr, false);
    assert.ok(options.loading());
  }
});

test('detail server route validates the ID and returns only the client wrapper', async () => {
  const Page = load('app/(route)/reviews/[id]/page.tsx', {
    '@/_features/review/components/reviews-query-boundary': { default: 'boundary' },
    '@/_features/review/components/detail/review-detail-client': { default: 'client' },
    '@/_features/review/components/detail/review-detail-skeleton': { default: 'skeleton' },
    '@/_features/review/lib/review-id': { isValidReviewId: (id) => /^[1-9]\d*$/.test(id) },
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
  }).default;
  const content = (id) => Page({ params: Promise.resolve({ id }) }).props.children.props.children.props.children;
  const valid = content('1');
  const client = await valid.type(valid.props);
  assert.equal(client.type, 'client');
  assert.equal(client.props.id, '1');
  const invalid = content('undefined');
  await assert.rejects(invalid.type(invalid.props), /NOT_FOUND/);
});

test('detail query makes one request and does not count focus or reconnect as another view', async () => {
  let requests = 0;
  const { useDetailReview: detailOptions } = load('_features/review/hooks/use-review.ts', {
    '@tanstack/react-query': { useSuspenseQuery: (options) => options },
    '../lib/review-submission': {},
    '../constant/review.keys': { reviewKeys: { detail: (id) => ['reviews', 'details', id] } },
    '@/_lib/api/api': { api: { get: async () => ({ data: { viewCount: ++requests } }) } },
    '@/_lib/notifications': {}, '@/_lib/auth-client': {},
    '@/_constant/api-path': { apiPath: { reviews: '/reviews' } },
    '../lib/review-id': { isValidReviewId: () => true },
  });
  const options = detailOptions('1');
  assert.equal(options.retry, false);
  assert.equal(options.refetchOnWindowFocus, false);
  assert.equal(options.refetchOnReconnect, false);
  const client = new QueryClient();
  client.mount();
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    assert.equal(requests, 1);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(requests, 1);
  } finally {
    unsubscribe();
    client.unmount();
    client.clear();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
  }
});
