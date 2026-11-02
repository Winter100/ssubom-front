import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, dependencies = {}) => {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

const review = {
  id: 42, title: 'Review', product: 'Sample headphones',
  category: { id: 1, category: 'Audio' }, rating: 4,
  createdAt: '2026-11-02', mainImageKey: null,
  author: { id: 1, nickname: 'Reader' },
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  duration: 'One month', pros: [], cons: [], verdict: '', viewCount: 0,
};

const imageUrls = load('_features/review/lib/review-image.ts');
const localImages = load('_features/review/lib/local-images.ts', { './editor-config': {} });
const categoryIcons = load('_features/review/lib/category-icon.ts');
const categoryLabel = load('_features/review/components/category-label.tsx', {
  '../lib/category-icon': categoryIcons,
});

test('detail displays product in its header and summary', () => {
  const Detail = load('_features/review/components/detail/review-detail-container.tsx', {
    '../../hooks/use-review': { useDetailReview: () => ({ data: review }) },
    '../../lib/editor-config': { createExtensions: () => [], richTextClasses: '' },
    '../../lib/review-image': imageUrls,
    './review-body': { default: () => null },
    '../category-label': categoryLabel,
  }).default;
  const html = renderToStaticMarkup(createElement(Detail, { id: '42' }));
  assert.equal(html.split(review.product).length - 1, 2);
  assert.match(html, new RegExp(`<header[\\s\\S]*${review.product}[\\s\\S]*</header>`));
  assert.match(html, new RegExp(`<dl[\\s\\S]*${review.product}[\\s\\S]*</dl>`));
});

test('detail cover uses the original public URL without optimization or enlargement', () => {
  const previous = process.env.NEXT_PUBLIC_IMAGE_URL;
  process.env.NEXT_PUBLIC_IMAGE_URL = 'https://images.example.com';
  try {
    const Detail = load('_features/review/components/detail/review-detail-container.tsx', {
      '../../hooks/use-review': { useDetailReview: () => ({ data: { ...review, mainImageKey: 'reviews/cover.png' } }) },
      '../../lib/editor-config': { richTextClasses: '' },
      '../../lib/review-image': imageUrls,
      './review-body': { default: () => null },
      '../category-label': categoryLabel,
    }).default;
    const html = renderToStaticMarkup(createElement(Detail, { id: '42' }));
    const cover = html.match(/<img\b[^>]*class="object-scale-down"[^>]*>/)?.[0];
    assert.ok(cover);
    assert.match(cover, /src="https:\/\/images.example.com\/reviews\/cover.png"/);
    assert.doesNotMatch(cover, /srcSet=|srcset=|\/_next\/image/);
    assert.match(html, /aspect-\[16\/9\]/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_IMAGE_URL;
    else process.env.NEXT_PUBLIC_IMAGE_URL = previous;
  }
});

test('shared cover form preserves its frame, original source and editing controls', () => {
  const Cover = load('_features/review/components/form/review-cover-image.tsx').default;
  const props = { disabled: false, onChange: () => {}, onRemove: () => {} };
  const html = renderToStaticMarkup(createElement(Cover, { ...props, image: 'blob:original' }));
  assert.match(html, /class="object-scale-down"/);
  assert.match(html, /src="blob:original"/);
  assert.match(html, /aspect-\[16\/9\]/);
  assert.match(html, /이미지 변경/);
  assert.match(html, /대표 이미지 삭제/);
  assert.doesNotMatch(html, /\/_next\/image/);
  const empty = renderToStaticMarkup(createElement(Cover, { ...props, image: '' }));
  assert.doesNotMatch(empty, /<img\b/);
  assert.match(empty, /대표 이미지 선택/);
});

test('review card preserves the original cover source without cropping or hover enlargement', () => {
  const Card = load('_features/review/components/review-card.tsx', {
    './category-label': categoryLabel,
    '../lib/review-image': imageUrls,
  }).default;
  const html = renderToStaticMarkup(createElement(Card, {
    review, imageSrc: 'https://images.example.com/original.png',
  }));
  const cover = html.match(/<img\b[^>]*class="object-scale-down"[^>]*>/)?.[0];
  assert.ok(cover);
  assert.match(cover, /src="https:\/\/images.example.com\/original.png"/);
  assert.doesNotMatch(cover, /srcset=|\/_next\/image|scale-105/);
  assert.match(html, /aspect-4\/3/);
});

test('category labels add matching decorative icons and retain unknown names', () => {
  for (const [category, icon] of [
    ['전자기기/IT', '💻'], ['뷰티/패션', '👗'], ['음식/맛집', '🍽️'],
    ['여행/숙박', '✈️'], ['문화/콘텐츠', '🎬'], ['생활/리빙', '🏠'],
    ['서비스/기타', '🛠️'], ['IT', '💻'], ['식품', '🍽️'],
    ['전체', '🗂️'], ['새 카테고리', '🏷️'],
  ]) {
    const html = renderToStaticMarkup(createElement(categoryLabel.default, { category }));
    assert.ok(html.includes(icon));
    assert.ok(html.includes(category));
    assert.match(html, /aria-hidden="true"/);
  }
});

test('category select adds icons while keeping category IDs as option values', () => {
  const Basics = load('_features/review/components/form/review-basics-fields.tsx', {
    '../../lib/category-icon': categoryIcons,
    '../../lib/review-validation': load('_features/review/lib/review-validation.ts'),
  }).default;
  const html = renderToStaticMarkup(createElement(Basics, {
    fields: load('_features/review/lib/review-types.ts').emptyFields,
    changeField: () => {}, showErrors: false,
    categoryList: [{ id: 1, category: 'IT' }, { id: 2, category: '식품' }],
  }));
  assert.match(html, /value="1">💻 IT<\/option>/);
  assert.match(html, /value="2">🍽️ 식품<\/option>/);
});

test('edit initializes product from the API response', () => {
  const Edit = load('app/(route)/reviews/edit/[id]/review-edit-content.tsx', {
    react: { useState: (initialize) => [initialize(), () => {}] },
    'next/navigation': { useRouter: () => ({ replace: () => {} }) },
    '@/_features/review/components/form/review-writer': { default: 'writer' },
    '@/_features/review/hooks/use-review': {
      useDetailMyReview: () => ({ data: review }),
      useUpdateReview: () => ({ isPending: false }),
    },
    '@/_features/review/lib/review-image': imageUrls,
    '@/_features/review/lib/local-images': localImages,
  }).default;
  assert.equal(Edit({ id: '42' }).props.initialReview.product, review.product);
});

test('create request preserves product as a string', async () => {
  let payload;
  const { createReview } = load('_features/review/lib/review-submission.ts', {
    './review-id': load('_features/review/lib/review-id.ts'),
    './local-images': { getImageSources: () => [], replaceImageSources: (body) => body },
    './review-validation': load('_features/review/lib/review-validation.ts'),
    './review-limits': load('_features/review/lib/review-limits.ts'),
    './review-api': {},
    '../hooks/use-review': { reviewApi: { create: async (value) => { payload = value; } } },
  });
  await createReview({ ...review, image: '', body: review.content }, new Map());
  assert.equal(payload.product, review.product);
  assert.equal(typeof payload.product, 'string');
});
