import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';


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
  const Form = load('_features/auth/components/auth-form.tsx', {
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
    '../hooks/use-auth': { useLogin: () => mutation, useSignup: () => mutation },

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

test('mypage reads shared query data and redirects only a confirmed anonymous user', () => {
  const routes = [];
  let query = { data: undefined, isPending: true, error: null, isFetching: true };
  const MyPageContent = load('_features/my/components/mypage-content.tsx', {
    react: { useEffect: (effect) => effect() },
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useRouter: () => ({ replace: (route) => routes.push(route) }) },
    '@/_features/auth/hooks/use-auth': { useMe: () => query },
    '@/_lib/auth-client': { getAuthErrorMessage: (error) => error.message },
    '@/_features/review/components/reviews-query-boundary': { __esModule: true, default: 'ReviewsQueryBoundary' },
    './my-reviews-feed': { __esModule: true, default: 'MyReviewsFeed' },
  }).default;
  assert.ok(JSON.stringify(MyPageContent()).includes('로그인 상태를 확인'));
  assert.deepEqual(routes, []);
  query = { data: { nickname: '독자', email: 'reader@example.com' }, isPending: false, error: null };
  assert.ok(JSON.stringify(MyPageContent()).includes('reader@example.com'));
  query = { data: undefined, isPending: false, error: new Error('서버 장애') };
  assert.ok(JSON.stringify(MyPageContent()).includes('서버 장애'));
  assert.deepEqual(routes, []);
  query = { data: null, isPending: false, error: null };
  MyPageContent();
  assert.deepEqual(routes, ['/login']);
});
