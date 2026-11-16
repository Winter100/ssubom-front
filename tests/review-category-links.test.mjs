import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const load = (file, overrides) => {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
};

test('list, image card and detail link to category and author searches on page one', () => {
  const { parseReviewSearchParams } = load('_features/review/hooks/use-review-search-params.ts', {
    'next/navigation': {},
  });
  for (const categoryId of [2, 7]) {
    const review = {
      id: 42, title: '리뷰', product: '상품', category: { id: categoryId, category: '디지털' },
      author: { nickname: '작성자 & + #/?' }, rating: 4, viewCount: 0, createdAt: '2026-11-05',
      content: { type: 'doc', content: [] }, mainImageKey: null,
    };
    const overrides = {
      'next/link': { __esModule: true, default: 'a' },
      'next/image': { __esModule: true, default: 'img' },
      '../lib/review-image': { getReviewImageUrl: () => '' },
      '../../lib/review-image': { getReviewImageUrl: () => '' },
      './category-label': { __esModule: true, default: 'CategoryLabel' },
      '../category-label': { __esModule: true, default: 'CategoryLabel' },
      '../../hooks/use-review': { useDetailReview: () => ({ data: review }) },
      '../../lib/editor-config': { richTextClasses: '' },
      './review-body': { __esModule: true, default: 'ReviewBody' },
      './review-comments': { __esModule: true, default: 'ReviewComments' },
    };
    for (const file of ['review-card.tsx', 'review-image-card.tsx', 'detail/review-detail-container.tsx']) {
      const Component = load(`_features/review/components/${file}`, overrides).default;
      const tree = Component({ review, id: '42' });
      const link = find(tree, (node) => node.type === 'a' && node.props['aria-label'] === '디지털 카테고리 리뷰 보기');
      assert.ok(link, file);
      const params = parseReviewSearchParams(new URL(link.props.href, 'https://example.com').searchParams);
      assert.equal(params.categoryId, categoryId);
      assert.equal(params.page, 1);
      assert.equal(new URL(link.props.href, 'https://example.com').pathname, '/reviews');
      const authorLink = find(tree, (node) => node.type === 'a' && node.props['aria-label'] === `${review.author.nickname} 작성자의 리뷰 보기`);
      assert.ok(authorLink, file);
      const authorUrl = new URL(authorLink.props.href, 'https://example.com');
      const authorParams = parseReviewSearchParams(authorUrl.searchParams);
      assert.equal(authorUrl.pathname, '/reviews');
      assert.equal(authorParams.searchType, 'author');
      assert.equal(authorParams.query, review.author.nickname);
      assert.equal(authorParams.page, 1);
      assert.equal(authorParams.categoryId, undefined);
    }
  }
});
