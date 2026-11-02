import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
const localImages = load('_features/review/lib/local-images.ts', { './editor-config': {} });
const fixture = ({ failIssue = false, failUpload = false, failUpdate = false, missingResponse = false } = {}) => {
  const issued = [];
  const uploaded = [];
  const requests = [];
  const submission = load('_features/review/lib/review-submission.ts', {
    './local-images': localImages,
    './review-validation': load('_features/review/lib/review-validation.ts'),
    './review-limits': load('_features/review/lib/review-limits.ts'),
    './review-id': load('_features/review/lib/review-id.ts'),
    './review-api': {
      issueReviewImageUrls: async (images) => {
        issued.push(images);
        if (failIssue) throw new Error('issue failed');
        const response = images.map(({ clientId }, index) => ({ clientId, key: `new/${index}`, url: `upload/${index}` })).reverse();
        return missingResponse ? response.slice(1) : response;
      },
      uploadReviewImage: async (url, file) => {
        uploaded.push({ url, file });
        if (failUpload) throw new Error('upload failed');
      },
    },
    '../hooks/use-review': { reviewApi: {
      update: async (id, payload) => {
        requests.push({ id, payload });
        if (failUpdate) throw new Error('update failed');
      },
      create: async (payload) => requests.push({ payload }),
    } },
  });
  return { ...submission, issued, uploaded, requests };
};
const image = (src, width = 320, height = 180) => ({ type: 'image', attrs: { src, width, height } });
const review = (nodes = [], cover = 'https://cdn.example/main') => ({
  title: 'Updated', product: 'Product', category: { id: 1, category: 'Test' },
  duration: 'One month', rating: 4.5, image: cover, pros: [' Good '], cons: [' Bad '], verdict: 'Recommended',
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited' }] }, ...nodes] },
});
const existing = new Map([
  ['https://cdn.example/main', 'old/main'], ['https://cdn.example/A', 'old/A'], ['https://cdn.example/B', 'old/B'],
]);
const files = new Map([
  ['blob:C', new File(['C'], 'same.png', { type: 'image/png' })],
  ['blob:D', new File(['D'], 'same.png', { type: 'image/png' })],
  ['blob:unused', new File(['unused'], 'unused.png', { type: 'image/png' })],
]);

test('text, image order and dimensions change without uploading existing images', async () => {
  const f = fixture();
  const input = review([image('https://cdn.example/B', 240, 360), image('https://cdn.example/A')]);
  const original = structuredClone(input);
  await f.updateReview('42', input, files, existing);
  assert.equal(f.issued.length, 0);
  assert.equal(f.uploaded.length, 0);
  const { id, payload } = f.requests[0];
  assert.equal(id, '42');
  assert.equal(payload.mainImageKey, 'old/main');
  assert.deepEqual(payload.subImageKeys, ['old/B', 'old/A']);
  assert.equal(payload.content.content[1].attrs.width, 240);
  assert.equal(payload.content.content[1].attrs.height, 360);
  assert.equal(payload.product, input.product);
  assert.equal(payload.duration, input.duration);
  assert.equal(payload.rating, input.rating);
  assert.equal(payload.verdict, input.verdict);
  assert.deepEqual(payload.pros, ['Good']);
  assert.deepEqual(payload.cons, ['Bad']);
  assert.equal('body' in payload, false);
  assert.deepEqual(input, original);
});

test('mixed images upload only new referenced files, matching reversed responses by clientId', async () => {
  const f = fixture();
  await f.updateReview('42', review([
    image('https://cdn.example/A'),
    { type: 'blockquote', content: [image('blob:C'), image('blob:D'), image('blob:C')] },
  ], 'blob:C'), files, existing);
  assert.equal(f.issued.length, 1);
  assert.equal(f.issued[0].length, 2);
  assert.equal(new Set(f.issued[0].map(({ clientId }) => clientId)).size, 2);
  assert.deepEqual(f.uploaded.map(({ file }) => file), [files.get('blob:C'), files.get('blob:D')]);
  const { payload } = f.requests[0];
  assert.equal(payload.mainImageKey, 'new/0');
  assert.deepEqual(payload.subImageKeys, ['old/A', 'new/1']);
  assert.equal(payload.content.content[2].content[0].attrs.src, 'new/0');
  assert.equal(payload.content.content[2].content[1].attrs.src, 'new/1');
});

test('cover deletion retains body keys and omits deleted images', async () => {
  const f = fixture();
  await f.updateReview('42', review([image('https://cdn.example/A')], ''), new Map(), existing);
  assert.equal(f.requests[0].payload.mainImageKey, null);
  assert.deepEqual(f.requests[0].payload.subImageKeys, ['old/A']);
  assert.equal(f.issued.length, 0);
});

test('issuance, upload and incomplete response failures prevent PUT and preserve input', async () => {
  for (const options of [{ failIssue: true }, { failUpload: true }, { missingResponse: true }]) {
    const f = fixture(options);
    const input = review([image('blob:C')]);
    const original = structuredClone(input);
    await assert.rejects(f.updateReview('42', input, files, existing));
    assert.equal(f.requests.length, 0);
    assert.deepEqual(input, original);
  }
});

test('missing files, unknown existing keys and invalid IDs fail before upload', async () => {
  for (const source of ['blob:missing', 'https://unknown.example/image']) {
    const f = fixture();
    await assert.rejects(f.updateReview('42', review([image(source)]), new Map(), existing));
    assert.equal(f.issued.length, 0);
    assert.equal(f.requests.length, 0);
  }
  const f = fixture();
  await assert.rejects(f.updateReview('invalid', review(), files, existing));
  assert.equal(f.requests.length, 0);
});

test('PUT failure rejects without mutating the draft or retrying automatically', async () => {
  const f = fixture({ failUpdate: true });
  const input = review([image('blob:C')]);
  const original = structuredClone(input);
  await assert.rejects(f.updateReview('42', input, files, existing), /update failed/);
  assert.equal(f.requests.length, 1);
  assert.equal(f.issued.length, 1);
  assert.deepEqual(input, original);
});

test('create shares the content payload and new image upload behavior', async () => {
  const f = fixture();
  await f.createReview(review([image('blob:D')], 'blob:C'), files);
  const { payload } = f.requests[0];
  assert.equal(payload.mainImageKey, 'new/0');
  assert.deepEqual(payload.subImageKeys, ['new/1']);
  assert.equal(payload.content.content[1].attrs.src, 'new/1');
  assert.equal('body' in payload, false);
});

test('update mutation invalidates public and member review caches without retries', async () => {
  let options;
  let sent;
  let invalidated;
  const { useUpdateReview } = load('_features/review/hooks/use-review.ts', {
    '@tanstack/react-query': {
      useMutation: (value) => { options = value; return value; },
      useQueryClient: () => ({ invalidateQueries: async (value) => { invalidated = value; } }),
    },
    '../lib/review-submission': { updateReview: async (...args) => { sent = args; } },
    '../constant/review.keys': { reviewKeys: { all: ['reviews'] } },
    '@/_lib/api/api': {}, '@/_lib/notifications': {}, '@/_lib/auth-client': {},
    '@/_constant/api-path': { apiPath: {} }, './review-id': {},
    '../lib/review-id': {},
  });
  useUpdateReview();
  const input = review();
  await options.mutationFn({ reviewId: '42', review: input, files, existingImages: existing });
  assert.deepEqual(sent, ['42', input, files, existing]);
  await options.onSuccess();
  assert.deepEqual(invalidated, { queryKey: ['reviews'] });
  assert.equal(options.retry, false);
});

test('edit keeps the initial source-key mapping across refetches and navigates only after success', async () => {
  const previous = process.env.NEXT_PUBLIC_IMAGE_URL;
  process.env.NEXT_PUBLIC_IMAGE_URL = 'https://cdn.example';
  try {
    let snapshot;
    let data = { ...review(), content: review([image('old/A')]).body, mainImageKey: 'old/main' };
    let sent;
    const navigations = [];
    let fail = true;
    const Edit = load('app/(route)/reviews/edit/[id]/review-edit-content.tsx', {
      react: { useState: (initialize) => {
        snapshot ??= initialize();
        return [snapshot, () => {}];
      } },
      'next/navigation': { useRouter: () => ({ replace: (url) => navigations.push(url) }) },
      '@/_features/review/components/form/review-writer': { default: 'writer' },
      '@/_features/review/hooks/use-review': {
        useDetailMyReview: () => ({ data }),
        useUpdateReview: () => ({ isPending: true, mutateAsync: async (input) => {
          sent = input;
          if (fail) throw new Error('failed');
        } }),
      },
      '@/_features/review/lib/review-image': load('_features/review/lib/review-image.ts'),
      '@/_features/review/lib/local-images': localImages,
    }).default;
    const first = Edit({ id: '42' });
    assert.equal(first.props.initialReview.image, 'https://cdn.example/old/main');
    assert.equal(first.props.initialReview.body.content[1].attrs.src, 'https://cdn.example/old/A');
    assert.equal(first.props.submitting, true);
    data = { ...data, mainImageKey: 'other/main' };
    const second = Edit({ id: '42' });
    assert.equal(second.props.initialReview, first.props.initialReview);
    await assert.rejects(second.props.onSubmit(first.props.initialReview, new Map()), /failed/);
    assert.deepEqual(navigations, []);
    assert.equal(sent.existingImages.get('https://cdn.example/old/A'), 'old/A');
    assert.equal(sent.existingImages.get('https://cdn.example/old/main'), 'old/main');
    fail = false;
    await second.props.onSubmit(first.props.initialReview, new Map());
    assert.deepEqual(navigations, ['/reviews/42']);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_IMAGE_URL;
    else process.env.NEXT_PUBLIC_IMAGE_URL = previous;
  }
});
