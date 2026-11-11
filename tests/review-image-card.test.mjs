import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const source = ts.transpileModule(
  fs.readFileSync('_features/review/components/review-image-card.tsx', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
).outputText;
const compiled = { exports: {} };
const overrides = {
  'next/link': { __esModule: true, default: 'a' },
  'next/image': { __esModule: true, default: 'img' },
  '../lib/review-image': { getReviewImageUrl: (key) => key || '' },
  './review-helpful-count': { __esModule: true, default: 'helpful-count' },
  './category-label': { __esModule: true, default: 'category' },
};
new Function('require', 'module', 'exports', source)(
  (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
);
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
};

test('image card keeps review metadata and uses the new placeholder when no image exists', () => {
  for (const mainImageKey of [null, 'https://example.com/product.jpg']) {
    const review = {
      id: 7, title: '상품 사용 후기', category: { category: '디지털' }, rating: 4.5,
      author: { nickname: '작성자', profileImage: null },
      createdAt: '2026-11-05T09:00:00', viewCount: 1234, mainImageKey,
    };
    const tree = compiled.exports.default({ review });
    assert.equal(find(tree, (node) => node.type === 'img' && node.props.fill).props.src,
      mainImageKey || '/reviews/product-placeholder.svg');
    assert.equal(find(tree, (node) => node.type === 'a').props.href, '/reviews/7');
    assert.ok(find(tree, (node) => node.props?.children === review.title));
    assert.ok(find(tree, (node) => node.props?.children === review.author.nickname));
    assert.ok(find(tree, (node) => node.props?.category === review.category.category));
    assert.ok(find(tree, (node) => node.props?.['aria-label'] === '5점 만점에 4.5점'));
    assert.ok(find(tree, (node) => Array.isArray(node.props?.children) && node.props.children.includes('1,234')));
    assert.equal(find(tree, (node) => node.type === 'time').props.dateTime, review.createdAt);
    assert.ok(fs.existsSync('public/reviews/product-placeholder.svg'));
  }
});

test('image card renders optional management actions outside its navigation links', () => {
  const actions = { type: 'button', props: { children: '삭제' } };
  const tree = compiled.exports.default({
    review: {
      id: 7, title: '내 리뷰', category: { category: '디지털' }, rating: 4,
      author: { nickname: '작성자' }, createdAt: '2026-11-05', viewCount: 0,
      mainImageKey: null,
    },
    actions,
  });
  assert.equal(find(tree, (node) => node === actions), actions);
  assert.equal(find(tree, (node) => node.type === 'a' && find(node.props.children, (child) => child === actions)), undefined);
});
