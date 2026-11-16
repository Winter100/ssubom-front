import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const load = (file, overrides) => {
  const compiled = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? (name === '@/_features/common/components/loading-spinner'
      ? { default: 'spinner' } : require(name)), compiled, compiled.exports);
  return compiled.exports;
};
test('like and unlike update detail and pages immediately and roll back only the target review', async () => {
  const { QueryClient } = require('@tanstack/react-query');
  const client = new QueryClient();
  const { reviewKeys } = load('_features/review/constant/review.keys.ts', {});
  let mutation;
  const requests = [];
  let tokenRevision = 0;
  let reserved = false;
  const hooks = load('_features/review/hooks/use-review.ts', {
    '@/_features/my/hooks/use-withdrawal': {
      useWithdrawal: () => ({ assertAllowed: async () => {
        if (reserved) throw new Error('탈퇴 예약 중');
      } }),
    },
    '@tanstack/react-query': { useQueryClient: () => client, useMutation: (options) => { mutation = options; } },
    '../lib/review-submission': {},
    '../constant/review.keys': { reviewKeys },
    '@/_lib/api/api': { api: { put: async (path) => requests.push(['PUT', path]), delete: async (path) => requests.push(['DELETE', path]) } },
    '@/_lib/notifications': { notifyError: () => {} },
    '@/_lib/auth-client': { getAuthErrorMessage: () => '' },
    '@/_constant/api-path': { apiPath: { reviews: 'reviews' } },
    '../lib/review-id': { isValidReviewId: () => true },
    '../lib/review-types': {},
    '@/_features/auth/stores/tokenStore': { getTokenRevision: () => tokenRevision },
  });
  for (const [initial, count] of [[false, 12], [true, 12], [false, 0], [true, 1]]) {
    const detailKey = reviewKeys.detail('1');
    const pageKey = reviewKeys.pagination({ page: 1 });
    const memberKey = [...reviewKeys.memberReviews(), { page: 1 }];
    const editKey = reviewKeys.memberReview('1');
    const edit = { id: 1, title: '수정용 데이터' };
    client.setQueryData(editKey, edit);
    client.setQueryData(detailKey, { id: 1, isLike: initial, likeCount: count });
    const page = { content: [{ id: 1, isLike: initial, likeCount: count }, { id: 2, isLike: false, likeCount: 4 }] };
    client.setQueryData(pageKey, page);
    client.setQueryData(memberKey, page);
    if (initial) hooks.useDeleteLike('1'); else hooks.useInsertLike('1');
    const context = await mutation.onMutate();
    assert.equal(client.getQueryData(detailKey).isLike, !initial);
    const expectedCount = count + (initial ? -1 : 1);
    assert.equal(client.getQueryData(detailKey).likeCount, expectedCount);
    assert.equal(client.getQueryData(pageKey).content[0].isLike, !initial);
    assert.equal(client.getQueryData(pageKey).content[0].likeCount, expectedCount);
    assert.equal(client.getQueryData(memberKey).content[0].isLike, !initial);
    assert.equal(client.getQueryData(memberKey).content[0].likeCount, expectedCount);
    assert.deepEqual(client.getQueryData(editKey), edit);
    assert.deepEqual(client.getQueryData(pageKey).content[1], page.content[1]);
    await mutation.mutationFn();
    assert.deepEqual(requests.at(-1), [initial ? 'DELETE' : 'PUT', 'reviews/1/like']);
    client.setQueryData(pageKey, (current) => ({ ...current, content: current.content.map((review) => review.id === 2 ? { ...review, isLike: true, likeCount: 5 } : review) }));
    mutation.onError(new Error('failed'), undefined, context);
    assert.equal(client.getQueryData(detailKey).isLike, initial);
    assert.equal(client.getQueryData(detailKey).likeCount, count);
    assert.equal(client.getQueryData(pageKey).content[0].isLike, initial);
    assert.equal(client.getQueryData(pageKey).content[0].likeCount, count);
    assert.equal(client.getQueryData(memberKey).content[0].isLike, initial);
    assert.equal(client.getQueryData(memberKey).content[0].likeCount, count);
    assert.equal(client.getQueryData(pageKey).content[1].isLike, true);
    assert.equal(client.getQueryData(pageKey).content[1].likeCount, 5);
    mutation.onSettled();
    assert.equal(client.getQueryState(detailKey).isInvalidated, true);
    client.setQueryData(detailKey, { id: 1, isLike: false, likeCount: 100 });
    client.setQueryData(pageKey, { content: [{ id: 1, isLike: false, likeCount: 100 }] });
    tokenRevision++;
    mutation.onError(new Error('failed after logout'), undefined, context);
    assert.equal(client.getQueryData(detailKey).isLike, false);
    assert.equal(client.getQueryData(pageKey).content[0].isLike, false);
    assert.equal(client.getQueryData(detailKey).likeCount, 100);
    assert.equal(client.getQueryData(pageKey).content[0].likeCount, 100);
  }
  reserved = true;
  for (const createMutation of [hooks.useInsertLike, hooks.useDeleteLike]) {
    createMutation('1');
    const before = client.getQueryData(reviewKeys.detail('1'));
    const requestCount = requests.length;
    await assert.rejects(mutation.onMutate(), /탈퇴 예약 중/);
    assert.deepEqual(client.getQueryData(reviewKeys.detail('1')), before);
    assert.equal(requests.length, requestCount);
  }
  client.clear();
});

test('detail summary displays the server count for members and anonymous visitors, including zero', () => {
  for (const [user, reserved] of [[{ id: 1 }, false], [null, false], [{ id: 1 }, true]]) {
    const { default: ReviewHelpful } = load('_features/review/components/detail/review-helpful.tsx', {
      '@/_features/auth/hooks/use-auth': {
        useMe: () => ({ data: user, isPending: false, isError: false }),
      },
      '@/_features/my/hooks/use-withdrawal': {
        useWithdrawal: () => ({ blocked: reserved, data: { scheduledAt: reserved ? '2026-11-18T00:00:00Z' : null } }),
      },
      '@tanstack/react-query': { useIsMutating: () => 0 },
      '../../hooks/use-review': {
        useInsertLike: () => ({}), useDeleteLike: () => ({}),
      },
      '../../constant/review.keys': { reviewKeys: { all: ['reviews'] } },
      '../review-helpful-count': {},
    });
    for (const countLike of [0, 1234]) {
      const tree = ReviewHelpful({ reviewId: '1', isLike: true, countLike });
      const button = tree.props.children[0];
      assert.equal(button.props.children[2].props.children, countLike.toLocaleString('ko-KR'));
      assert.equal(button.props.disabled, user === null || reserved);
      assert.equal(button.props['aria-pressed'], user !== null);
    }
  }
});
