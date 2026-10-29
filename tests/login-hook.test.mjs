import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const dependency = createRequire(import.meta.url);
const load = (filename, modules) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => modules[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

class ApiError extends Error {
  constructor(status) { super('request failed'); this.status = status; }
}

const setup = (getMe = async () => ({ id: 1, nickname: '독자' })) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: Infinity } } });
  const authKeys = { all: ['auth'], me: () => ['auth', 'me'] };
  const store = load('_features/auth/stores/tokenStore.ts', {});
  const storage = new Map();
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  } });
  const session = load('_features/auth/lib/session.ts', {
    '../constant/auth.keys': { authKeys }, '../stores/tokenStore': store,
  });
  const response = { user: { id: 1, nickname: '독자' }, accessToken: 'token' };
  const modules = {
    '@tanstack/react-query': { useQueryClient: () => queryClient, useMutation: (options) => options, useQuery: (options) => options },
    '../constant/auth.keys': { authKeys }, '../stores/tokenStore': store, '../lib/session': session,
    '@/_lib/api/get-api': { getMe },
    '@/_lib/api/post-api': { login: async () => response, logout: async () => {}, signup: async () => {} },
    '@/_lib/api/api': { ApiError, refreshAccessToken: async () => 'renewed' },
  };
  return {
    hooks: load('_features/auth/hooks/use-auth.ts', modules),
    queryClient, storage, store, session, response,
    cleanup: () => {
      queryClient.clear();
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    },
  };
};

test('login seeds shared user cache; logout clears session and preserves public data', async () => {
  const fixture = setup();
  try {
    const { hooks, queryClient, response, store, storage } = fixture;
    queryClient.setQueryData(['reviews'], ['keep']);
    const login = hooks.useLogin();
    await login.onSuccess(await login.mutationFn({ email: 'reader@example.com', password: '12345678' }));
    assert.deepEqual(queryClient.getQueryData(['auth', 'me']), response.user);
    assert.equal(store.getAccessToken(), 'token');
    assert.equal(storage.get('hasSession'), '1');
    hooks.useLogout().onSuccess();
    assert.equal(queryClient.getQueryData(['auth', 'me']), null);
    assert.equal(store.getAccessToken(), null);
    assert.equal(storage.has('hasSession'), false);
    assert.deepEqual(queryClient.getQueryData(['reviews']), ['keep']);
  } finally { fixture.cleanup(); }
});

test('anonymous visitors skip HTTP; session hints restore user with shared concurrent query', async () => {
  let calls = 0;
  const fixture = setup(async () => { calls++; return { id: 1, nickname: '독자' }; });
  try {
    const options = fixture.hooks.useMe();
    assert.equal(await fixture.queryClient.fetchQuery(options), null);
    assert.equal(calls, 0);
    fixture.storage.set('hasSession', '1');
    fixture.queryClient.removeQueries({ queryKey: ['auth'] });
    const users = await Promise.all([
      fixture.queryClient.fetchQuery(options), fixture.queryClient.fetchQuery(options),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(users[0], users[1]);
  } finally { fixture.cleanup(); }
});

test('401 yields anonymous data while server errors remain errors', async () => {
  for (const status of [401, 503]) {
    const fixture = setup(async () => { throw new ApiError(status); });
    try {
      fixture.storage.set('hasSession', '1');
      const request = fixture.queryClient.fetchQuery(fixture.hooks.useMe());
      if (status === 401) assert.equal(await request, null);
      else await assert.rejects(request, { status: 503 });
    } finally { fixture.cleanup(); }
  }
});

test('expiry bridge clears session and subscribed user queries receive anonymous data', () => {
  const fixture = setup();
  let expire;
  let cleanup;
  const observer = new QueryObserver(fixture.queryClient, { queryKey: ['auth', 'me'], enabled: false });
  const unsubscribe = observer.subscribe(() => {});
  try {
    fixture.queryClient.setQueryData(['auth', 'me'], fixture.response.user);
    fixture.store.setAccessToken('token');
    fixture.storage.set('hasSession', '1');
    const { AuthSession } = load('_features/auth/components/auth-session.tsx', {
      react: { useEffect: (effect) => { cleanup = effect(); } },
      '@tanstack/react-query': { useQueryClient: () => fixture.queryClient },
      '@/_lib/api/api': { onAuthExpired: (handler) => { expire = handler; return () => { expire = undefined; }; } },
      '../lib/session': fixture.session,
    });
    AuthSession();
    expire();
    assert.equal(observer.getCurrentResult().data, null);
    assert.equal(fixture.store.getAccessToken(), null);
    assert.equal(fixture.storage.has('hasSession'), false);
  } finally { cleanup?.(); unsubscribe(); fixture.cleanup(); }
});
