import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import axios from 'axios';

const dependency = createRequire(import.meta.url);
const load = (filename, overrides = {}) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? (name === '@/_constant/api-path'
      ? load('_constant/api-path.ts') : dependency(name)), compiled, compiled.exports,
  );
  return compiled.exports;
};

test('configured apiPath values attach tokens only for the registered methods', async () => {
  const { apiPath } = load('_constant/api-path.ts');
  const routes = load('_constant/auth-api-paths.ts', { './api-path': { apiPath } });
  const { api } = load('_lib/api/api.ts', {
    '@/_features/auth/stores/tokenStore': { getAccessToken: () => 'token' },
    '@/_constant/auth-api-paths': routes,
  });
  api.defaults.adapter = async (config) => ({
    config, status: 200, statusText: 'OK', headers: {},
    data: config.headers.get('Authorization') ?? null,
  });
  assert.equal((await api.get(apiPath.me)).data, 'Bearer token');
  assert.equal((await api.post(apiPath.reviews)).data, 'Bearer token');
  assert.equal((await api.get(apiPath.reviews)).data, null);
});

test('api attaches the latest stored token, preserves explicit authorization and omits cleared tokens', async () => {
  const store = load('_features/auth/stores/tokenStore.ts');
  const { api } = load('_lib/api/api.ts', {
    '@/_features/auth/stores/tokenStore': store,
    '@/_constant/auth-api-paths': { authApiPaths: [{ method: 'GET', path: 'me' }] },
  });
  const headers = [];
  api.defaults.adapter = async (config) => {
    headers.push(config.headers);
    return { config, status: 200, statusText: 'OK', headers: {}, data: {} };
  };

  await api.get('/me');
  assert.equal(headers.at(-1).get('Authorization'), undefined);
  store.setAccessToken('first');
  await api.get('/me', { headers: { 'X-Test': 'retained' } });
  assert.equal(headers.at(-1).get('Authorization'), 'Bearer first');
  assert.equal(headers.at(-1).get('X-Test'), 'retained');
  store.setAccessToken('renewed');
  await api.get('/me');
  assert.equal(headers.at(-1).get('Authorization'), 'Bearer renewed');
  await api.get('/me', { headers: { Authorization: 'Bearer explicit' } });
  assert.equal(headers.at(-1).get('Authorization'), 'Bearer explicit');
  store.setAccessToken(null);
  await api.get('/me');
  assert.equal(headers.at(-1).get('Authorization'), undefined);
});

test('only listed paths receive a token; an empty list disables automatic attachment', async () => {
  for (const authApiPaths of [[], [
    { method: 'GET', path: 'me' },
    { method: 'GET', path: '/member' },
    { method: 'POST', path: 'reviews' },
  ]]) {
    const { api } = load('_lib/api/api.ts', {
      '@/_features/auth/stores/tokenStore': { getAccessToken: () => 'token' },
      '@/_constant/auth-api-paths': { authApiPaths },
    });
    api.defaults.adapter = async (config) => ({
      config, status: 200, statusText: 'OK', headers: {},
      data: config.headers.get('Authorization') ?? null,
    });
    for (const url of ['/me', 'me?tab=profile', '/member']) {
      const response = await api.get(url);
      assert.equal(response.data, authApiPaths.length ? 'Bearer token' : null);
    }
    for (const url of ['/reviews', '/me/other', '/members', 'https://example.com/me']) {
      assert.equal((await api.get(url)).data, null);
    }
    assert.equal((await api.post('/reviews')).data, authApiPaths.length ? 'Bearer token' : null);
    assert.equal((await api.put('/reviews')).data, null);
    assert.equal((await api.delete('/reviews')).data, null);
  }
});

const unauthorized = (config, status = 401) => new axios.AxiosError(
  'failed', undefined, config, undefined,
  { status, data: { message: 'failed' }, headers: {}, config, statusText: 'failed' },
);

const setupRefresh = (refresh) => {
  const store = load('_features/auth/stores/tokenStore.ts');
  store.setAccessToken('old');
  let refreshes = 0;
  const { api, ApiError, onAuthExpired } = load('_lib/api/api.ts', {
    '@/_features/auth/stores/tokenStore': store,
    '@/_constant/auth-api-paths': { authApiPaths: [{ method: 'GET', path: 'me' }] },
    axios: { __esModule: true, default: {
      ...axios,
      post: async (url, body, config) => {
        refreshes++;
        assert.equal(url, 'auth/refresh');
        assert.equal(body, undefined);
        assert.equal(config.withCredentials, true);
        assert.equal(config.baseURL, api.defaults.baseURL);
        return refresh(config, store);
      },
    } },
  });
  return { api, ApiError, store, onAuthExpired, refreshes: () => refreshes };
};

test('concurrent protected 401s share refresh and replay requests with the new token', async () => {
  const fixture = setupRefresh(async () => ({ data: { accessToken: 'new' } }));
  const sent = [];
  fixture.api.defaults.adapter = async (config) => {
    const token = config.headers.get('Authorization');
    sent.push(token);
    if (token === 'Bearer old') throw unauthorized(config);
    return { config, status: 200, headers: {}, data: 'ok', statusText: 'OK' };
  };
  const results = await Promise.all([fixture.api.get('/me'), fixture.api.get('/me')]);
  assert.deepEqual(results.map((response) => response.data), ['ok', 'ok']);
  assert.equal(fixture.refreshes(), 1);
  assert.equal(fixture.store.getAccessToken(), 'new');
  assert.deepEqual(sent, ['Bearer old', 'Bearer old', 'Bearer new', 'Bearer new']);
});

test('public 401 and protected 403 never refresh', async () => {
  const fixture = setupRefresh(() => assert.fail('unexpected refresh'));
  fixture.api.defaults.adapter = async (config) => { throw unauthorized(config, config.url === '/me' ? 403 : 401); };
  await assert.rejects(fixture.api.get('/reviews'), { status: 401 });
  await assert.rejects(fixture.api.get('/me'), { status: 403 });
  assert.equal(fixture.refreshes(), 0);
  assert.equal(fixture.store.getAccessToken(), 'old');
});

test('refresh 401 clears token and is converted to ApiError without recursion', async () => {
  const fixture = setupRefresh(() => { throw unauthorized({}); });
  let expired = 0;
  fixture.onAuthExpired(() => { expired++; });
  fixture.api.defaults.adapter = async (config) => { throw unauthorized(config); };
  await assert.rejects(fixture.api.get('/me'), (error) => error instanceof fixture.ApiError && error.status === 401);
  assert.equal(fixture.refreshes(), 1);
  assert.equal(fixture.store.getAccessToken(), null);
  assert.equal(expired, 1);
});

test('a retried 401 stops after one replay and clears the rejected token', async () => {
  const fixture = setupRefresh(async () => ({ data: { accessToken: 'new' } }));
  let sends = 0;
  fixture.api.defaults.adapter = async (config) => { sends++; throw unauthorized(config); };
  await assert.rejects(fixture.api.get('/me'), { status: 401 });
  assert.equal(sends, 2);
  assert.equal(fixture.refreshes(), 1);
  assert.equal(fixture.store.getAccessToken(), null);
});

test('all refresh failures clear token and notify logout without replaying the request', async () => {
  for (const failure of [
    unauthorized({}, 400), unauthorized({}, 503),
    new axios.AxiosError('offline', 'ERR_NETWORK'),
    new axios.AxiosError('timeout', 'ECONNABORTED'),
    new Error('invalid response'),
  ]) {
    const fixture = setupRefresh(async () => { throw failure; });
    let expired = 0;
    let sends = 0;
    fixture.onAuthExpired(() => { expired++; });
    fixture.api.defaults.adapter = async (config) => { sends++; throw unauthorized(config); };
    await assert.rejects(fixture.api.get('/me'), fixture.ApiError);
    assert.equal(fixture.store.getAccessToken(), null);
    assert.equal(expired, 1);
    assert.equal(sends, 1);
    assert.equal(fixture.refreshes(), 1);
  }
});

test('failure from an old refresh cannot log out a newer login', async () => {
  const fixture = setupRefresh(async () => {
    fixture.store.setAccessToken('new-login');
    throw unauthorized({}, 503);
  });
  fixture.onAuthExpired(() => assert.fail('new login must remain active'));
  fixture.api.defaults.adapter = async (config) => { throw unauthorized(config); };
  await assert.rejects(fixture.api.get('/me'), { status: 503 });
  assert.equal(fixture.store.getAccessToken(), 'new-login');
});

test('a late old-token 401 reuses the renewed token without a second refresh', async () => {
  const fixture = setupRefresh(async () => ({ data: { accessToken: 'new' } }));
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  fixture.api.defaults.adapter = async (config) => {
    if (config.headers.get('Authorization') === 'Bearer old') {
      if (config.params?.late) await gate;
      throw unauthorized(config);
    }
    return { config, status: 200, headers: {}, data: 'ok', statusText: 'OK' };
  };
  const late = fixture.api.get('/me', { params: { late: true } });
  await fixture.api.get('/me');
  release();
  assert.equal((await late).data, 'ok');
  assert.equal(fixture.refreshes(), 1);
});

test('a missing token is restored by refresh; malformed refresh responses do not replay', async () => {
  for (const data of [{ accessToken: 'new' }, { accessToken: '' }]) {
    const fixture = setupRefresh(async () => ({ data }));
    fixture.store.setAccessToken(null);
    let sends = 0;
    fixture.api.defaults.adapter = async (config) => {
      sends++;
      if (!config.headers.get('Authorization')) throw unauthorized(config);
      return { config, status: 200, headers: {}, data: 'ok', statusText: 'OK' };
    };
    if (data.accessToken) {
      assert.equal((await fixture.api.get('/me')).data, 'ok');
      assert.equal(fixture.store.getAccessToken(), 'new');
      assert.equal(sends, 2);
    } else {
      await assert.rejects(fixture.api.get('/me'), fixture.ApiError);
      assert.equal(sends, 1);
      assert.equal(fixture.store.getAccessToken(), null);
    }
    assert.equal(fixture.refreshes(), 1);
  }
});

test('logout during refresh cannot restore a token even when the previous token was null', async () => {
  const fixture = setupRefresh(async () => {
    fixture.store.setAccessToken(null);
    return { data: { accessToken: 'stale' } };
  });
  fixture.store.setAccessToken(null);
  fixture.api.defaults.adapter = async (config) => { throw unauthorized(config); };
  await assert.rejects(fixture.api.get('/me'), fixture.ApiError);
  assert.equal(fixture.store.getAccessToken(), null);
  assert.equal(fixture.refreshes(), 1);
});
