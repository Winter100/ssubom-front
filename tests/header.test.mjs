import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const renderHeader = (auth) => {
  const source = ts.transpileModule(
    fs.readFileSync('_features/common/components/header.tsx', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
  ).outputText;
  const overrides = {
    '@/_constant/web': { project: { title: '써봄', header_description: '' } },
    '@/_features/auth/hooks/use-auth': { useMe: () => ({
      data: auth.user, isPending: auth.status === 'loading', error: null,
    }) },
    'next/link': { __esModule: true, default: 'a' },
    'next/image': { __esModule: true, default: 'img' },
  };
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports.default();
};

const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (typeof node.type === 'function') return find(node.type(node.props), predicate);
  return predicate(node) ? node : find(node.props?.children, predicate);
};
const link = (tree, href) => find(tree, (node) => node.type === 'a' && node.props.href === href);

test('anonymous and loading states do not expose authenticated navigation', () => {
  const anonymous = renderHeader({ status: 'anonymous', user: null, error: '' });
  assert.equal(link(anonymous, '/login').props.children, '로그인');
  assert.equal(link(anonymous, '/reviews/new'), undefined);
  assert.equal(link(anonymous, '/mypage'), undefined);
  const loading = renderHeader({ status: 'loading', user: null, error: '' });
  assert.equal(link(loading, '/login'), undefined);
  assert.ok(find(loading, (node) => node.props?.role === 'status'));
});

test('authenticated navigation shows nickname, profile URL and fallback image', () => {
  for (const profileImage of [undefined, null, '', 'https://example.com/profile.jpg']) {
    const tree = renderHeader({
      status: 'authenticated', user: { id: 1, nickname: '독자', profileImage }, error: '',
    });
    assert.ok(link(tree, '/reviews/new'));
    assert.equal(link(tree, '/login'), undefined);
    const dropdown = find(tree, (node) => node.type === 'details');
    const trigger = find(dropdown, (node) => node.type === 'summary');
    assert.ok(find(trigger, (node) => node.props?.children === '독자'));
    assert.equal(link(trigger, '/mypage'), undefined);
    assert.equal(link(dropdown, '/mypage').props.children, '마이페이지');
    assert.equal(link(dropdown, '/reviews/new').props.children, '리뷰 쓰기');
    const image = find(trigger, (node) => node.type === 'img');
    assert.equal(image.props.src, profileImage || '/default-profile.svg');
    const target = { src: image.props.src, srcset: 'broken' };
    image.props.onError({ currentTarget: target });
    assert.equal(target.src, '/default-profile.svg');
    assert.equal(target.srcset, '');
  }
});

test('profile dropdown closes on focus leaving and Escape, retaining focus within', () => {
  const tree = renderHeader({ status: 'authenticated', user: { nickname: '독자' } });
  const dropdown = find(tree, (node) => node.type === 'details');
  let focused = false;
  const target = {
    open: true,
    contains: (element) => element === 'inside',
    querySelector: () => ({ focus: () => { focused = true; } }),
  };
  dropdown.props.onBlur({ currentTarget: target, relatedTarget: 'inside' });
  assert.equal(target.open, true);
  dropdown.props.onBlur({ currentTarget: target, relatedTarget: null });
  assert.equal(target.open, false);
  target.open = true;
  dropdown.props.onKeyDown({ currentTarget: target, key: 'Escape' });
  assert.equal(target.open, false);
  assert.equal(focused, true);
});
