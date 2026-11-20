import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
const require = createRequire(import.meta.url);
const load = (file, overrides = {}) => {
  const compiled = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? require(name), compiled, compiled.exports);
  return compiled.exports;
};
test('session cleanup clears likes on all cached pages and details and cancels old responses', async () => {
  const client = new QueryClient();
  const store = load('_features/auth/stores/tokenStore.ts');
  const keys = load('_features/review/constant/review.keys.ts');
  const { reviewKeys, adminReviewKey, reportTypeKey } = keys;
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map([['hasSession', '1']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { removeItem: (key) => storage.delete(key) } });
  const { clearSession, clearReportQueries, getReportSessionSignal } = load('_features/auth/lib/session.ts', {
    '../constant/auth.keys': { authKeys: { all: ['auth'] } },
    '../stores/tokenStore': store,
    '@/_features/review/constant/review.keys': keys,
  });
  try {
    store.setAccessToken('token');
    client.setQueryData(['auth', 'me'], { id: 1 });
    const review = { id: 1, title: 'keep title', isLike: true };
    const page = { content: [review, { id: 2, isLike: false }], totalPages: 2 };
    const pageKeys = [reviewKeys.pagination({ page: 1 }), reviewKeys.pagination({ page: 2 }), [...reviewKeys.memberReviews(), { page: 1 }]];
    for (const key of pageKeys) client.setQueryData(key, page);
    const detailKey = reviewKeys.detail('1');
    client.setQueryData(detailKey, review);
    const reportedKey = reviewKeys.detail('2');
    client.setQueryData(reportedKey, { id: 2, isLike: true, isReported: true, isReportedToday: true });
    const adminKey = [...adminReviewKey, 1, 'reports'];
    const categoryKey = [...adminReviewKey, 1, 'categories'];
    const typeKey = [...reportTypeKey, 1];
    client.setQueryData(adminKey, ['private reports']);
    client.setQueryData(categoryKey, ['admin categories']);
    client.setQueryData(typeKey, ['active reason']);
    const previousSignal = getReportSessionSignal();
    clearReportQueries(client);
    assert.equal(previousSignal.aborted, true);
    assert.equal(client.getQueryData(reportedKey).isReportedToday, undefined);
    assert.equal(client.getQueryData(adminKey), undefined);
    assert.equal(client.getQueryData(categoryKey), undefined);
    assert.equal(client.getQueryData(typeKey), undefined);
    client.setQueryData(reportedKey, { id: 2, isLike: true, isReported: true, isReportedToday: true });
    client.setQueryData(reviewKeys.categories(), ['keep category']);
    client.setQueryData(reviewKeys.memberReviewCounts(), [{ count: 2 }]);
    let resolveResponse;
    const pending = client.fetchQuery({ queryKey: pageKeys[0], queryFn: () => new Promise((resolve) => { resolveResponse = resolve; }) }).catch(() => {});
    clearSession(client);
    assert.equal(store.getAccessToken(), null);
    assert.equal(storage.has('hasSession'), false);
    assert.equal(client.getQueryData(['auth', 'me']), null);
    for (const key of pageKeys) assert.deepEqual(client.getQueryData(key), { ...page, content: page.content.map((item) => ({ ...item, isLike: false })) });
    assert.deepEqual(client.getQueryData(detailKey), { ...review, isLike: false });
    assert.deepEqual(client.getQueryData(reportedKey), {
      id: 2, isLike: false, isReported: false, isReportedToday: false,
    });
    assert.deepEqual(client.getQueryData(reviewKeys.categories()), ['keep category']);
    assert.deepEqual(client.getQueryData(reviewKeys.memberReviewCounts()), [{ count: 2 }]);
    resolveResponse(page);
    await pending;
    assert.equal(client.getQueryData(pageKeys[0]).content[0].isLike, false);
  } finally {
    client.clear();
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('report status refresh is scheduled at the next Korea Standard Time midnight', () => {
  const { msUntilSeoulMidnight } = load('_features/review/lib/review-report-api.ts', {
    '@/_constant/api-path': {},
    '@/_lib/api/api': {},
  });
  assert.equal(msUntilSeoulMidnight(Date.parse('2026-11-20T14:59:59.999Z')), 1);
  assert.equal(msUntilSeoulMidnight(Date.parse('2026-11-20T15:00:00Z')), 86_400_000);
});
