import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const source = ts.transpileModule(
  fs.readFileSync('_features/review/components/review-card.tsx', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
).outputText;
const compiled = { exports: {} };
const overrides = {
  'next/link': { __esModule: true, default: 'a' },
  'next/image': { __esModule: true, default: 'img' },
};
new Function('require', 'module', 'exports', source)(
  (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
);
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
};

test('review card displays author profile or default image and formatted view count', () => {
  for (const profileImage of [undefined, null, '', 'https://example.com/profile.jpg']) {
    for (const viewCount of [0, 1234]) {
      const tree = compiled.exports.default({ review: {
        id: 1, title: '리뷰', category: { category: '리빙' }, rating: 4,
        author: { nickname: '독자', profileImage }, createdAt: '2026-10-30', viewCount,
      } });
      const avatar = find(tree, (node) => node.type === 'img' && node.props.width === 24);
      assert.equal(avatar.props.src, profileImage || '/default-profile.svg');
      const target = { src: avatar.props.src, srcset: 'broken' };
      avatar.props.onError({ currentTarget: target });
      assert.equal(target.src, '/default-profile.svg');
      assert.equal(target.srcset, '');
      assert.ok(find(tree, (node) => node.props?.children === '독자' ||
        (Array.isArray(node.props?.children) && node.props.children.includes('독자'))));
      assert.ok(find(tree, (node) => node.type === 'span' && node.props.children === '조회수 '));
      assert.ok(find(tree, (node) => node.type === 'span' &&
        Array.isArray(node.props.children) && node.props.children.includes(viewCount.toLocaleString('ko-KR'))));
      const date = find(tree, (node) => node.type === 'time');
      assert.equal(date.props.dateTime, '2026-10-30');
      assert.ok(date.props.children.includes('2026.10.30'));
    }
  }
});

test('detail keeps its title and displays matching metadata plus summary views', () => {
  for (const profileImage of [null, 'https://example.com/profile.jpg']) {
    const review = {
      title: '상세 제목', author: { nickname: '독자', profileImage },
      createdAt: '2026-10-30', viewCount: 1234, category: { category: '리빙' }, rating: 4,
    };
    const detailSource = ts.transpileModule(
      fs.readFileSync('_features/review/components/detail/review-detail-container.tsx', 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
    ).outputText;
    const detailModule = { exports: {} };
    const detailOverrides = {
      ...overrides,
      '../../hooks/use-review': { useDetailReview: () => ({ data: review }) },
      '../../lib/editor-config': { createExtensions: () => [], richTextClasses: '' },
      '@tiptap/static-renderer/pm/react': { renderToReactElement: () => null },
    };
    new Function('require', 'module', 'exports', detailSource)(
      (name) => detailOverrides[name] ?? dependency(name), detailModule, detailModule.exports,
    );
    const tree = detailModule.exports.default({ id: '1' });
    const header = find(tree, (node) => node.type === 'header');
    assert.equal(find(header, (node) => node.type === 'h1').props.children, review.title);
    const image = find(header, (node) => node.type === 'img');
    assert.equal(image.props.src, profileImage || '/default-profile.svg');
    const target = { src: image.props.src, srcset: 'broken' };
    image.props.onError({ currentTarget: target });
    assert.equal(target.src, '/default-profile.svg');
    assert.equal(target.srcset, '');
    assert.ok(find(header, (node) => node.type === 'span' && Array.isArray(node.props.children) && node.props.children.includes('1,234')));
    assert.equal(find(header, (node) => node.type === 'time').props.dateTime, review.createdAt);
    const summary = find(tree, (node) => node.type === 'dl');
    assert.ok(find(summary, (node) => node.type === 'dt' && node.props.children === '조회수'));
    assert.ok(find(summary, (node) => node.type === 'dd' && node.props.children === '1,234'));
  }
});
