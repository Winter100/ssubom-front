import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const dependency = createRequire(import.meta.url);
const load = (file, modules) => {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => modules[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

const setup = () => {
  const client = new QueryClient();
  const key = ['auth', 'me'];
  client.setQueryData(key, { id: 7, nickname: '기존', profileImage: '/old.png' });
  const calls = [];
  const upload = { fail: false };
  const hooks = load('_features/my/hooks/use-update-profile.ts', {
    '@tanstack/react-query': { useQueryClient: () => client, useMutation: (options) => options },
    '@/_constant/api-path': { apiPath: { me: 'member' } },
    '@/_lib/api/api': { api: { post: async (path, payload) => { calls.push(['POST', path, payload]); } } },
    '@/_features/auth/constant/auth.keys': { authKeys: { me: () => key } },
    '@/_features/review/constant/review.keys': load('_features/review/constant/review.keys.ts', {}),
    '@/_features/review/lib/review-image': { getReviewImageUrl: (imageKey) => `https://images.example.com/${imageKey}` },
    '@/_features/review/lib/review-api': {
      issueReviewImageUrls: async (images) => {
        calls.push(['ISSUE', images]);
        return [{ clientId: images[0].clientId, key: 'reviews/profile', url: 'https://upload.example.com' }];
      },
      uploadReviewImage: async (url, file) => {
        calls.push(['UPLOAD', url, file]);
        if (upload.fail) throw new Error('업로드 실패');
      },
    },
  });
  return { client, key, calls, upload, mutation: hooks.useUpdateProfile(7) };
};

test('nickname-only update skips uploading; image update sends the object key after upload and updates shared user data', async () => {
  const { client, key, calls, mutation } = setup();
  try {
    const nickname = await mutation.mutationFn({ nickName: '새이름' });
    assert.deepEqual(calls, [['POST', 'member', { nickName: '새이름' }]]);
    await mutation.onSuccess(nickname);
    assert.equal(client.getQueryData(key).nickname, '새이름');
    assert.equal(client.getQueryData(key).profileImage, '/old.png');
    calls.length = 0;
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    const image = await mutation.mutationFn({ file });
    assert.deepEqual(calls.map(([step]) => step), ['ISSUE', 'UPLOAD', 'POST']);
    assert.equal(calls[0][1][0].fileSize, file.size);
    assert.equal(calls[0][1][0].contentType, file.type);
    assert.equal(calls[2][2].profileImage, 'reviews/profile');
    await mutation.onSuccess(image);
    assert.equal(client.getQueryData(key).profileImage, 'https://images.example.com/reviews/profile');
    assert.equal(client.getQueryData(key).nickname, '새이름');
  } finally { client.clear(); }
});

test('saving a profile refreshes nickname cooldown and the active member page without refetching detail or edit', async () => {
  const { client, key, mutation } = setup();
  const { reviewKeys } = load('_features/review/constant/review.keys.ts', {});
  const pageKey = [...reviewKeys.memberReviews(), { page: 2, categoryId: 3 }];
  const inactiveKey = [...reviewKeys.memberReviews(), { page: 1 }];
  const detailKey = reviewKeys.detail('1');
  const editKey = reviewKeys.memberReview('1');
  const oldPage = { content: [{ id: 1, author: { nickname: '기존' } }] };
  const newPage = { content: [{ id: 1, author: { nickname: '새이름', profileImage: 'reviews/new' } }] };
  let pageReads = 0;
  let otherReads = 0;
  const unsubscribes = [];
  try {
    const member = new QueryObserver(client, {
      queryKey: key,
      staleTime: Infinity,
      queryFn: async () => ({ id: 7, nickname: '새이름', nicknameChangedAt: '2026-11-11T03:00:00Z' }),
    });
    unsubscribes.push(member.subscribe(() => {}));
    client.setQueryData(inactiveKey, oldPage);
    for (const queryKey of [pageKey, detailKey, editKey]) {
      client.setQueryData(queryKey, oldPage);
      const observer = new QueryObserver(client, {
        queryKey,
        staleTime: Infinity,
        queryFn: async () => {
          if (queryKey === pageKey) {
            pageReads++;
            return newPage;
          }
          otherReads++;
          return oldPage;
        },
      });
      unsubscribes.push(observer.subscribe(() => {}));
    }
    await mutation.onSuccess({ nickName: '새이름', profileImage: 'reviews/new' });
    assert.equal(pageReads, 1);
    assert.equal(otherReads, 0);
    assert.deepEqual(client.getQueryData(pageKey), newPage);
    assert.equal(client.getQueryData(key).nicknameChangedAt, '2026-11-11T03:00:00Z');
    assert.equal(client.getQueryState(inactiveKey).isInvalidated, true);
  } finally {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    client.clear();
  }
});

test('upload failure prevents member update; an old request cannot restore another accounts profile', async () => {
  const { client, key, calls, mutation, upload } = setup();
  try {
    upload.fail = true;
    await assert.rejects(mutation.mutationFn({ file: new File(['image'], 'avatar.png', { type: 'image/png' }) }), /업로드 실패/);
    assert.equal(calls.some(([step]) => step === 'POST'), false);
    client.setQueryData(key, { id: 8, nickname: '다른회원' });
    await mutation.onSuccess({ nickName: '이전요청' });
    assert.equal(client.getQueryData(key).nickname, '다른회원');
    await assert.rejects(mutation.mutationFn({ nickName: '이전요청' }), /로그인 정보가 변경/);
  } finally { client.clear(); }
});

test('login and member lookup turn stored profile image keys into display URLs', async () => {
  const user = { id: 7, nickname: '회원', profileImage: 'reviews/profile' };
  const hooks = load('_features/auth/hooks/use-auth.ts', {
    '@tanstack/react-query': { useQuery: (options) => options },
    '../constant/auth.keys': { authKeys: { me: () => ['auth', 'me'] } },
    '../stores/tokenStore': { getAccessToken: () => 'token' },
    '../lib/session': {},
    '@/_features/review/constant/review.keys': load('_features/review/constant/review.keys.ts', {}),
    '@/_constant/api-path': { apiPath: { login: 'auth/login', me: 'member' } },
    '@/_lib/api/api': { api: {
      post: async () => ({ data: { user, accessToken: 'token' } }),
      get: async () => ({ data: user }),
    } },
    '@/_features/review/lib/review-image': { getReviewImageUrl: (key) => `https://images.example.com/${key}` },
  });
  const login = await hooks.login({ email: 'member@example.com', password: 'password' });
  assert.equal(login.user.profileImage, 'https://images.example.com/reviews/profile');
  const me = await hooks.useMe().queryFn({ signal: new AbortController().signal });
  assert.equal(me.profileImage, login.user.profileImage);
});
