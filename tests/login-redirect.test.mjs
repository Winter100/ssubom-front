import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const load = (filename, mocks = {}) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => mocks[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const redirect = load('_features/auth/lib/login-redirect.ts');

test('return destinations preserve local queries and anchors and reject external URLs and auth loops', () => {
  assert.equal(redirect.getLoginReturnTo('/reviews/42?query=키보드#review-comments'), '/reviews/42?query=%ED%82%A4%EB%B3%B4%EB%93%9C#review-comments');
  const href = redirect.getLoginHref('/reviews?page=2&categoryId=3#reviews');
  assert.equal(new URL(href, 'http://localhost').searchParams.get('returnTo'), '/reviews?page=2&categoryId=3#reviews');
  assert.equal(redirect.getLoginHref('/'), '/login');
  for (const value of [undefined, '', 'https://example.com', '//example.com', '/\\example.com',
    'javascript:alert(1)', '/login?returnTo=/mypage', '/signup/', '/a/../login']) {
    assert.equal(redirect.getLoginReturnTo(value), '/', String(value));
  }
});

test('login click captures the URL at navigation time, including changed query and hash', () => {
  const routes = [];
  const LoginLink = load('_features/auth/components/login-link.tsx', {
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useRouter: () => ({ push: (href) => routes.push(href) }) },
    '../lib/login-redirect': redirect,
  }).default;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { pathname: '/reviews/42', search: '?from=search', hash: '#review-comments' },
  } });
  try {
    const link = LoginLink({ children: '로그인', className: 'button' });
    let prevented = false;
    link.props.onNavigate({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(new URL(routes[0], 'http://localhost').searchParams.get('returnTo'), '/reviews/42?from=search#review-comments');
    window.location = { pathname: '/reviews', search: '?page=3', hash: '' };
    link.props.onNavigate({ preventDefault: () => {} });
    assert.equal(new URL(routes[1], 'http://localhost').searchParams.get('returnTo'), '/reviews?page=3');
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});

test('login page forwards a single returnTo parameter and ignores duplicate parameter arrays', async () => {
  const Page = load('app/(route)/login/page.tsx', {
    '@/_features/auth/components/auth-form': { __esModule: true, default: 'AuthForm' },
  }).default;
  for (const returnTo of ['/reviews/42#review-comments', ['/reviews/42', '/mypage'], undefined]) {
    const page = Page({ searchParams: Promise.resolve({ registered: '1', returnTo }) });
    const content = page.props.children.props.children;
    const form = await content.type(content.props);
    assert.equal(form.props.returnTo, typeof returnTo === 'string' ? returnTo : undefined);
    assert.equal(form.props.registered, true);
  }
});
