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
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  return compiled.exports;
};

test('image keys resolve against the configured URL and remote patterns allow only that prefix', () => {
  const previous = process.env.NEXT_PUBLIC_IMAGE_URL;
  process.env.NEXT_PUBLIC_IMAGE_URL = 'https://images.example.com/public/';
  try {
    const { getReviewImageUrl } = load('_features/review/lib/review-image.ts');
    assert.equal(getReviewImageUrl('/reviews/photo.webp'), 'https://images.example.com/public/reviews/photo.webp');
    assert.equal(getReviewImageUrl(null), '');
    assert.equal(getReviewImageUrl('blob:local'), 'blob:local');
    assert.equal(getReviewImageUrl('https://images.example.com/public/old.webp'), 'https://images.example.com/public/old.webp');
    const config = load('next.config.ts').default;
    const { hasRemoteMatch } = require('next/dist/shared/lib/match-remote-pattern');
    assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL(getReviewImageUrl('photo.webp'))), true);
    assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL('https://other.example.com/photo.webp')), false);
    assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL('https://images.example.com/private/photo.webp')), false);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_IMAGE_URL;
    else process.env.NEXT_PUBLIC_IMAGE_URL = previous;
  }
});

test('nested body images render through Next Image with server dimensions without changing JSON', () => {
  const previous = process.env.NEXT_PUBLIC_IMAGE_URL;
  process.env.NEXT_PUBLIC_IMAGE_URL = 'https://images.example.com';
  try {
    const limits = load('_features/review/lib/review-limits.ts');
    const config = load('_features/review/lib/editor-config.ts', { './review-limits': limits });
    const Body = load('_features/review/components/detail/review-body.tsx', {
      '../../lib/editor-config': config,
      '../../lib/review-image': load('_features/review/lib/review-image.ts'),
    }).default;
    const content = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Original text' }] },
      { type: 'image', attrs: { src: 'reviews/first.webp', width: 320, height: 180, alt: 'First' } },
      { type: 'blockquote', content: [
        { type: 'image', attrs: { src: 'reviews/second.webp', width: '240', height: '360', alt: 'Second' } },
      ] },
    ] };
    const original = structuredClone(content);
    const { ImageConfigContext } = require('next/dist/shared/lib/image-config-context.shared-runtime');
    const { imageConfigDefault } = require('next/dist/shared/lib/image-config');
    const html = renderToStaticMarkup(createElement(ImageConfigContext.Provider, {
      value: { ...imageConfigDefault, remotePatterns: [new URL('https://images.example.com/**')] },
    }, createElement(Body, { content })));
    const images = html.match(/<img\b[^>]*>/g) ?? [];
    assert.equal(images.length, 2);
    assert.match(images[0], /width="320" height="180"/);
    assert.match(images[1], /width="240" height="360"/);
    assert.match(images[0], /data-nimg="1"/);
    assert.match(images[0], /width:320px;max-width:100%;height:auto/);
    assert.match(images[0], /%2Freviews%2Ffirst.webp/);
    assert.match(images[1], /%2Freviews%2Fsecond.webp/);
    assert.match(html, /<p>Original text<\/p>/);
    assert.match(html, /<blockquote>/);
    assert.deepEqual(content, original);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_IMAGE_URL;
    else process.env.NEXT_PUBLIC_IMAGE_URL = previous;
  }
});
