import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import axios from 'axios';

const dependency = createRequire(import.meta.url);
const load = (file, overrides) => {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  const require = (name) => {
    if (name in overrides) return overrides[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), overrides);
    return dependency(name);
  };
  new Function('require', 'module', 'exports', source)(require, compiled, compiled.exports);
  return compiled.exports;
};

const mount = (mode, respond = async () => {}) => {
  const states = [];
  let cursor = 0;
  const ref = { current: false };
  const calls = [];
  const routes = [];
  const mutation = { isPending: false, reset: () => {}, mutateAsync: async (input) => { calls.push(input); await respond(); } };
  const Form = load('app/_components/auth-form.tsx', {
    react: {
      useRef: () => ref,
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
    },
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useRouter: () => ({ replace: (route) => routes.push(route) }) },
    '../_hooks/use-login': { useLogin: () => mutation },
    '../_hooks/use-signup': { useSignup: () => mutation },
  }).default;
  const render = () => { cursor = 0; return Form({ mode }); };
  const find = (node, match) => {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map((child) => find(child, match)).find(Boolean);
    if (match(node)) return node;
    return find(node.props?.children, match);
  };
  const change = (name, value) => find(render(), (node) => node.type === 'input' && node.props.name === name).props.onChange({ target: { value } });
  const submit = () => find(render(), (node) => node.type === 'form').props.onSubmit({ preventDefault: () => {}, currentTarget: { querySelector: () => ({ focus: () => {} }) } });
  return { states, calls, routes, render, find, change, submit };
};

test('invalid form makes no request; errored fields revalidate while editing', async () => {
  const form = mount('signup');
  await form.submit();
  assert.equal(form.calls.length, 0);
  assert.ok(form.states[1].email);
  form.change('email', ' reader@example.com ');
  assert.equal(form.states[1].email, '');
  const email = form.find(form.render(), (node) => node.type === 'input' && node.props.name === 'email');
  assert.equal(email.props['aria-invalid'], false);
});

test('signup trims email/nickname, preserves password, omits confirmation and navigates', async () => {
  const form = mount('signup');
  for (const [name, value] of Object.entries({ email: ' reader@example.com ', nickname: ' 독자 ', password: ' secret12 ', passwordConfirm: ' secret12 ' })) form.change(name, value);
  await form.submit();
  assert.deepEqual(form.calls, [{ email: 'reader@example.com', nickname: '독자', password: ' secret12 ' }]);
  assert.deepEqual(form.routes, ['/login?registered=1']);
});

test('login prevents duplicate pending submissions and navigates home on success', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const form = mount('login', () => gate);
  form.change('email', ' reader@example.com ');
  form.change('password', '12345678');
  const pending = form.submit();
  await form.submit();
  assert.equal(form.calls.length, 1);
  release();
  await pending;
  assert.deepEqual(form.routes, ['/']);
});

test('failure preserves input, shows message, and allows another submission', async () => {
  const form = mount('login', async () => { throw new Error('로그인 실패'); });
  form.change('email', 'reader@example.com');
  form.change('password', '12345678');
  await form.submit();
  assert.equal(form.states[0].password, '12345678');
  assert.equal(form.states[2], '로그인 실패');
  assert.equal(form.find(form.render(), (node) => node.props?.role === 'alert').props.children, '로그인 실패');
  await form.submit();
  assert.equal(form.calls.length, 2);
  assert.equal(form.routes.length, 0);
});

const mountProvider = (http) => {
  const states = [];
  let cursor = 0;
  let restore;
  let initialRender = true;
  const revision = { current: 0 };
  const cache = new Map();
  const queryClient = {
    setQueryData: (key, value) => cache.set(JSON.stringify(key), value),
    removeQueries: () => cache.clear(),
  };
  const { AuthProvider } = load('app/_components/auth-provider.tsx', {
    react: {
      createContext: () => ({ Provider: 'provider' }),
      useRef: () => revision,
      useEffect: (effect) => { if (initialRender) restore = effect; },
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], (value) => { states[index] = value; }];
      },
    },
    '@tanstack/react-query': {
      useQueryClient: () => queryClient,
      useQuery: ({ queryKey }) => ({ data: cache.get(JSON.stringify(queryKey)) }),
    },
    '@/lib/api': { api: http },
    '../_constant/api-path': { apiPathAuth: { login: '/login', signup: '/signup', refresh: '/refresh', currentUser: '/me' } },
  });
  const render = () => { cursor = 0; return AuthProvider({ children: null }).props.value; };
  render();
  initialRender = false;
  return { render, cache, restore: () => restore() };
};

test('provider restores user/cache and header changes from loading to write link', async () => {
  const provider = mountProvider({
    post: async () => ({ data: { accessToken: 'restored' } }),
    request: async () => ({ data: { id: 2, email: 'reader@example.com', nickname: '독자' } }),
  });
  const Header = load('components/layout/header.tsx', {
    '@/app/_constant/web': { project: { title: '써봄', header_description: '' } },
    '@/app/_components/auth-provider': { useAuth: () => provider.render() },
    'next/link': { __esModule: true, default: 'a' },
  }).default;
  assert.equal(provider.render().status, 'loading');
  assert.ok(JSON.stringify(Header()).includes('확인 중'));
  const cleanup = provider.restore();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(provider.render().status, 'authenticated');
  assert.deepEqual(provider.render().user, { id: 2, email: 'reader@example.com', nickname: '독자' });
  assert.deepEqual(provider.cache.get('["auth","currentUser"]'), { id: 2, email: 'reader@example.com', nickname: '독자' });
  assert.ok(JSON.stringify(Header()).includes('/reviews/new'));
  assert.ok(JSON.stringify(Header()).includes('/mypage'));
  assert.ok(JSON.stringify(Header()).includes('독자님 마이페이지로 이동'));
  provider.cache.set('["auth","currentUser"]', { id: 2, email: 'reader@example.com', nickname: '바뀐닉네임' });
  assert.equal(provider.render().user.nickname, '바뀐닉네임');
  assert.ok(JSON.stringify(Header()).includes('바뀐닉네임님 마이페이지로 이동'));
  cleanup();
});

test('provider login updates user immediately and refresh 401 clears user/cache', async () => {
  let unauthorized = false;
  const provider = mountProvider({
    post: async () => {
      if (unauthorized) throw new axios.AxiosError('expired', undefined, undefined, undefined, { status: 401 });
      return { data: { member: { id: 3, email: 'reader@example.com', nickname: '회원' }, accessToken: 'login-token' } };
    },
  });
  const response = await provider.render().client.login({ email: 'a@b.com', password: '12345678' });
  const { useLogin } = load('app/_hooks/use-login.ts', {
    '@tanstack/react-query': { useMutation: (options) => options },
    '../_components/auth-provider': { useAuth: () => provider.render() },
  });
  useLogin().onSuccess(response);
  assert.equal(provider.render().status, 'authenticated');
  assert.deepEqual(provider.render().user, response.member);
  assert.equal(provider.cache.size, 1);
  unauthorized = true;
  await assert.rejects(provider.render().client.refresh());
  assert.equal(provider.render().status, 'anonymous');
  assert.equal(provider.render().user, null);
  assert.equal(provider.cache.size, 0);
});

test('provider distinguishes restoration outage from anonymous session', async () => {
  const provider = mountProvider({ post: async () => { throw new axios.AxiosError('offline', 'ERR_NETWORK'); } });
  const cleanup = provider.restore();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(provider.render().status, 'error');
  assert.match(provider.render().error, /네트워크/);
  cleanup();
});

test('mypage renders user details, redirects only anonymous users, and explains outages', () => {
  const routes = [];
  const member = { id: 1, email: 'reader@example.com', nickname: '독자' };
  let auth = { status: 'loading', user: null, error: '' };
  let query = { error: null, isFetching: false };
  const MyPageContent = load('app/(route)/mypage/_components/mypage-content.tsx', {
    react: { useEffect: (effect) => effect() },
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useRouter: () => ({ replace: (route) => routes.push(route) }) },
    '@/app/_components/auth-provider': { useAuth: () => auth },
    '@/app/_hooks/use-current-user': { useCurrentUser: () => query },
    '@/app/_lib/auth-client': { getAuthErrorMessage: (error, fallback) => error instanceof Error ? error.message : fallback },
  }).default;
  assert.ok(JSON.stringify(MyPageContent()).includes('로그인 상태를 확인'));
  assert.deepEqual(routes, []);
  auth = { status: 'authenticated', user: member, error: '' };
  assert.ok(JSON.stringify(MyPageContent()).includes(member.email));
  assert.ok(JSON.stringify(MyPageContent()).includes(member.nickname));
  query = { error: new Error('서버 장애'), isFetching: false };
  assert.ok(JSON.stringify(MyPageContent()).includes('서버 장애'));
  assert.deepEqual(routes, []);
  auth = { status: 'error', user: null, error: '네트워크를 확인해 주세요.' };
  const outage = JSON.stringify(MyPageContent());
  assert.ok(outage.includes('네트워크를 확인'));
  assert.ok(outage.includes('/login'));
  assert.deepEqual(routes, []);
  auth = { status: 'anonymous', user: null, error: '' };
  MyPageContent();
  assert.deepEqual(routes, ['/login']);
});
