import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import axios from 'axios';

const requireDependency = createRequire(import.meta.url);
const load = (file) => {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(requireDependency, compiled, compiled.exports);
  return compiled.exports;
};
const { createAuthClient, getAuthErrorMessage } = load('app/_lib/auth-client.ts');
const { validateAuthField } = load('app/_lib/auth-validation.ts');
const paths = { login: '/login', signup: '/signup', refresh: '/refresh', currentUser: '/me' };
const failure = (status, data = {}) => new axios.AxiosError('failed', undefined, undefined, undefined, { status, data });
const valid = { email: ' reader@example.com ', password: '12345678', passwordConfirm: '12345678', nickname: ' 독자 ' };

test('email, password boundaries, confirmation, nickname validation', () => {
  for (const field of Object.keys(valid)) assert.equal(validateAuthField(field, valid), '');
  for (const email of ['', 'reader', 'a@', 'a b@example.com', 'a@example']) assert.ok(validateAuthField('email', { ...valid, email }));
  assert.ok(validateAuthField('password', { ...valid, password: '1234567' }));
  assert.equal(validateAuthField('password', { ...valid, password: ' 123456 ' }), '');
  assert.ok(validateAuthField('passwordConfirm', { ...valid, passwordConfirm: 'different' }));
  assert.ok(validateAuthField('nickname', { ...valid, nickname: '   ' }));
});

test('login/signup body and cookie options, bearer-only authenticated request', async () => {
  const calls = [];
  const http = axios.create({ adapter: async (config) => {
    calls.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config, data: config.url === '/login'
      ? { member: { id: 1, email: 'a@b.com', nickname: '독자' }, accessToken: 'first' } : { id: 1, email: 'a@b.com', nickname: '독자' } };
  } });
  const client = createAuthClient(http, paths, () => assert.fail('unexpected expiry'));
  assert.deepEqual(await client.login({ email: 'a@b.com', password: '12345678' }), {
    member: { id: 1, email: 'a@b.com', nickname: '독자' }, accessToken: 'first',
  });
  await client.signup({ email: 'a@b.com', password: '12345678', nickname: '독자' });
  assert.deepEqual(await client.currentUser(), { id: 1, email: 'a@b.com', nickname: '독자' });
  assert.equal(calls[0].withCredentials, true);
  assert.deepEqual(JSON.parse(calls[1].data), { email: 'a@b.com', password: '12345678', nickname: '독자' });
  assert.equal(calls[1].headers.Authorization, undefined);
  assert.equal(calls[2].headers.Authorization, 'Bearer first');
});

test('restore: refresh cookie first, then current user using the new token', async () => {
  const calls = [];
  const client = createAuthClient({
    post: async (...args) => { calls.push(args); return { data: { accessToken: 'restored' } }; },
    request: async (config) => { calls.push(config); return { data: { id: 7, email: 'a@b.com', nickname: '회원' } }; },
  }, paths, () => {});
  await client.refresh();
  assert.deepEqual(await client.currentUser(), { id: 7, email: 'a@b.com', nickname: '회원' });
  assert.deepEqual(calls[0], ['/refresh', undefined, { withCredentials: true }]);
  assert.equal(calls[1].headers.Authorization, 'Bearer restored');
});

test('concurrent 401 responses share one refresh', async () => {
  let refreshes = 0;
  let expired = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const http = {
    post: async (url) => {
      if (url === '/login') return { data: { member: { id: 1, email: 'a@b.com', nickname: 'A' }, accessToken: 'old' } };
      refreshes++;
      await gate;
      return { data: { accessToken: 'new' } };
    },
    request: async (config) => {
      if (config.headers.Authorization === 'Bearer old') throw failure(401);
      return { data: config.url };
    },
  };
  const client = createAuthClient(http, paths, () => { expired++; });
  await client.login({ email: 'a@b.com', password: '12345678' });
  const requests = [client.request({ url: '/first' }), client.request({ url: '/second' })];
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshes, 1);
  release();
  assert.deepEqual(await Promise.all(requests), ['/first', '/second']);
  assert.equal(expired, 0);
});

test('late old-token 401 uses the already renewed token without refreshing again', async () => {
  let release;
  let refreshes = 0;
  const delayed = new Promise((resolve) => { release = resolve; });
  const client = createAuthClient({
    post: async (url) => {
      if (url === '/login') return { data: { member: { id: 1, email: 'a@b.com', nickname: 'A' }, accessToken: 'old' } };
      refreshes++;
      return { data: { accessToken: 'new' } };
    },
    request: async (config) => {
      if (config.headers.Authorization === 'Bearer old') {
        if (config.url === '/late') await delayed;
        throw failure(401);
      }
      return { data: config.url };
    },
  }, paths, () => assert.fail('unexpected expiry'));
  await client.login({ email: 'a@b.com', password: '12345678' });
  const late = client.request({ url: '/late' });
  assert.equal(await client.request({ url: '/first' }), '/first');
  release();
  assert.equal(await late, '/late');
  assert.equal(refreshes, 1);
});

test('retry 401 clears session without another refresh; server errors do not expire it', async () => {
  let refreshes = 0;
  let expired = 0;
  let sends = 0;
  const client = createAuthClient({
    post: async () => { refreshes++; return { data: { accessToken: 'token' } }; },
    request: async () => { sends++; throw failure(401); },
  }, paths, () => { expired++; });
  await assert.rejects(client.currentUser());
  assert.equal(refreshes, 2); // Initial session restore plus one retry refresh.
  assert.equal(sends, 2);
  assert.equal(expired, 1);
  const failing = createAuthClient({ post: async () => { throw failure(503); } }, paths, () => { expired++; });
  await assert.rejects(failing.refresh());
  assert.equal(expired, 1);
});

test('refresh 401 clears session and does not retry', async () => {
  let calls = 0;
  let expired = 0;
  const client = createAuthClient({ post: async () => { calls++; throw failure(401); } }, paths, () => { expired++; });
  await assert.rejects(client.refresh());
  assert.equal(calls, 1);
  assert.equal(expired, 1);
});

test('unset endpoints never call the network and failed refresh can be tried again', async () => {
  let calls = 0;
  const client = createAuthClient({ post: async () => { calls++; } }, { ...paths, refresh: '', login: '' }, () => {});
  await assert.rejects(client.login({ email: '', password: '' }), /login/);
  await assert.rejects(client.refresh(), /refresh/);
  await assert.rejects(client.refresh(), /refresh/);
  assert.equal(calls, 0);
});

test('error messages support untrusted JSON, fallback, timeout, network failure', () => {
  assert.equal(getAuthErrorMessage(failure(400, { message: '이미 사용 중입니다.' }), '기본'), '이미 사용 중입니다.');
  for (const body of [null, 'error', { message: 42 }, { message: ' ' }]) assert.equal(getAuthErrorMessage(failure(400, body), '기본'), '기본');
  assert.match(getAuthErrorMessage(new axios.AxiosError('timeout', 'ECONNABORTED'), '기본'), /시간/);
  assert.match(getAuthErrorMessage(new axios.AxiosError('offline', 'ERR_NETWORK'), '기본'), /네트워크/);
});
