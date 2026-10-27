import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { MutationObserver, QueryClient } from '@tanstack/query-core';

const require = createRequire(import.meta.url);
const root = 'app/(route)/reviews/new/';
const load = (file, dependencies = {}, globals = {}) => {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    (name) => dependencies[name] ?? require(name), loaded, loaded.exports, ...Object.values(globals),
  );
  return loaded.exports;
};
const authModule = { exports: load('app/_lib/auth-client.ts') };
const apiErrors = load('lib/api.ts');
const limits = load(root + '_lib/review-limits.ts');
const validationModule = { exports: load(root + '_lib/review-validation.ts') };
const helpers = { exports: load(root + '_lib/local-images.ts', { './editor-config': {} }) };
const source = fs.readFileSync('app/(route)/reviews/new/_hooks/use-review-writer.ts', 'utf8');
const start = source.indexOf('  const submitReview =');
const end = source.indexOf('  const togglePreview', start);
assert(start !== -1 && end > start);
const compiled = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2021 },
}).outputText;

const run = async (failUpload = false, missingResponse = false, imageMode = 'both', failCreate = false, overrides = {}, failIssue = false) => {
  const body = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'keep me' }] },
    { type: 'image', attrs: { src: 'blob:first', alt: 'same.png', width: 320, height: 180 } },
    { type: 'blockquote', content: [
      { type: 'image', attrs: { src: 'blob:second', width: 240, height: 360 } },
    ] },
  ] };
  const fields = {
    image: 'blob:cover', title: 'Review', product: 'Product', rating: 4.5, verdict: '',
    category: { id: 42, category: '디지털' }, duration: '3개월', ...overrides,
  };
  if (imageMode === 'none' || imageMode === 'body') fields.image = '';
  if (imageMode === 'none' || imageMode === 'cover') body.content.splice(1);
  const files = new Map(['cover', 'first', 'second'].map((id) => [
    'blob:' + id, new File([id], 'same.png', { type: 'image/png' }),
  ]));
  let payload;
  let error;
  let busy;
  let message;
  const requests = [];
  const uploaded = [];
  const api = { post: async (path, request) => {
    requests.push(path);
    if (path === 'reviews') {
      if (failCreate) throw failCreate instanceof Error ? failCreate : new Error('Review creation failed');
      payload = request;
      return { data: { id: 1 } };
    }
    assert.equal(path, 'storage/presigned-url');
    if (failIssue) throw failIssue;
    const count = imageMode === 'cover' ? 1 : imageMode === 'body' ? 2 : 3;
    assert.equal(new Set(request.images.map((image) => image.clientId)).size, count);
    assert(request.images.every((image) => !('source' in image) && !('file' in image)));
    return { data: request.images.map((image, index) => ({
      clientId: image.clientId, key: 'key-' + index, url: 'url-' + index,
    })).reverse().slice(missingResponse ? 1 : 0) };
  } };
  const alerts = [];
  const notifications = load('app/_lib/notifications.ts', {}, {
    window: { alert: (message) => alerts.push(message) },
  });
  const reviewApi = load(root + '_lib/review-api.ts', {
    '@/lib/api': { api },
    '@/app/_lib/auth-client': authModule.exports,
    axios: { put: async (url, file, config) => {
      uploaded.push([url, { ...config, body: file, method: 'PUT' }]);
      if (failUpload) throw failUpload instanceof Error ? failUpload : Object.assign(new Error('Upload failed'), {
        isAxiosError: true, response: { data: '<Error/>', status: 500 },
      });
      return { status: 200 };
    } },
  });
  const submission = load(root + '_lib/review-submission.ts', {
    './review-api': reviewApi, './review-limits': limits, './review-validation': validationModule.exports, './local-images': helpers.exports,
  });
  const options = load(root + '_hooks/use-create-review.ts', {
    '@/lib/api': apiErrors,
    '@tanstack/react-query': { useMutation: (options) => options },
    '@/app/_lib/auth-client': authModule.exports,
    '@/app/_lib/notifications': notifications,
    '../_lib/review-submission': submission,
  }).useCreateReview();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } });
  const observer = new MutationObserver(client, options);
  const statuses = [];
  busy = false;
  const unsubscribe = observer.subscribe((state) => {
    busy = state.isPending;
    statuses.push(state.status);
  });
  let mutationPromise;
  const createReviewMutation = { isPending: false, mutate: (input, callbacks) => {
    assert.notEqual(input.files, files);
    mutationPromise = observer.mutate(input, callbacks).catch(() => {});
  } };
  const submit = new Function(
    'editor', 'readingImage', 'isSubmitting', 'fields', 'imageFiles', 'setError', 'setMessage',
    'getAuthErrorMessage', 'hasRequiredReviewFields', 'createReviewMutation',
    compiled + '\nreturn submitReview;',
  )(
    { getJSON: () => body }, false, false, fields, { current: files },
    (value) => { error = value; }, (value) => { message = value; },
    authModule.exports.getAuthErrorMessage, validationModule.exports.hasRequiredReviewFields, createReviewMutation,
  );
  submit();
  await mutationPromise;
  unsubscribe();
  client.clear();
  return { payload, error, busy, uploaded, body, requests, message, alerts, statuses };
};

test('same filenames and reordered responses preserve cover and nested body image mapping', async () => {
  const { payload, error, busy, uploaded, body } = await run();
  assert.equal(error, '');
  assert.equal(busy, false);
  assert.equal(payload.mainImageKey, 'key-0');
  assert.deepEqual(payload.subImageKeys, ['key-1', 'key-2']);
  assert.equal(payload.categoryId, 42);
  assert.equal('category' in payload, false);
  assert.equal(payload.body.content[1].attrs.src, 'key-1');
  assert.equal(payload.body.content[1].attrs.alt, 'same.png');
  assert.equal(payload.body.content[1].attrs.width, 320);
  assert.equal(payload.body.content[1].attrs.height, 180);
  assert.equal(payload.body.content[2].content[0].attrs.src, 'key-2');
  assert.equal(payload.body.content[2].content[0].attrs.width, 240);
  assert.equal(payload.body.content[2].content[0].attrs.height, 360);
  assert.deepEqual(payload.body.content[0], body.content[0]);
  assert.equal(body.content[1].attrs.src, 'blob:first');
  assert.equal(uploaded.length, 3);
  assert.equal(await uploaded[1][1].body.text(), 'first');
  assert.equal(uploaded[1][1].method, 'PUT');
  assert.equal(uploaded[1][1].withCredentials, false);
  assert.deepEqual(uploaded[1][1].headers, { 'Content-Type': 'image/png' });
});

test('failed uploads prevent payload creation and clear busy state', async () => {
  const { payload, error, busy } = await run(true);
  assert.equal(payload, undefined);
  assert.match(error, /이미지 업로드에 실패/);
  assert.equal(busy, false);
});

test('missing presigned responses prevent uploading', async () => {
  const { payload, error, uploaded } = await run(false, true);
  assert.equal(payload, undefined);
  assert.match(error, /발급받지 못한 키/);
  assert.equal(uploaded.length, 0);
});

test('without images only creates the review', async () => {
  const { payload, requests, uploaded, error, busy, body } = await run(false, false, 'none');
  assert.deepEqual(requests, ['reviews']);
  assert.equal(uploaded.length, 0);
  assert.equal(payload.mainImageKey, null);
  assert.deepEqual(payload.subImageKeys, []);
  assert.deepEqual(payload.body, body);
  assert.equal(error, '');
  assert.equal(busy, false);
});

for (const mode of ['cover', 'body', 'both']) {
  test(`${mode} images are uploaded before review creation`, async () => {
    const { payload, requests, uploaded } = await run(false, false, mode);
    assert.deepEqual(requests, ['storage/presigned-url', 'reviews']);
    assert.equal(uploaded.length, mode === 'cover' ? 1 : mode === 'body' ? 2 : 3);
    assert(payload);
    assert.equal(payload.mainImageKey, mode === 'body' ? null : 'key-0');
    assert.deepEqual(payload.subImageKeys,
      mode === 'cover' ? [] : mode === 'body' ? ['key-0', 'key-1'] : ['key-1', 'key-2']);
    assert(!payload.subImageKeys.includes(payload.mainImageKey));
  });
}

test('review creation failure shows error and clears busy state', async () => {
  const { payload, error, busy, message } = await run(false, false, 'none', true);
  assert.equal(payload, undefined);
  assert.equal(error, 'Review creation failed');
  assert.equal(busy, false);
  assert.equal(message, '');
});

test('Axios failures display the backend message instead of the default error', async () => {
  const failure = Object.assign(new Error('Request failed with status code 400'), {
    isAxiosError: true,
    response: { data: { message: '리뷰 제목을 입력해 주세요.' }, status: 400 },
  });
  const { error, busy } = await run(false, false, 'none', failure);
  assert.equal(error, '리뷰 제목을 입력해 주세요.');
  assert.equal(busy, false);
});

test('Axios responses without a valid message display the review fallback', async () => {
  for (const data of [null, {}, { message: '' }, { message: 123 }]) {
    const failure = Object.assign(new Error('Request failed with status code 500'), {
      isAxiosError: true,
      response: { data, status: 500 },
    });
    const { error } = await run(false, false, 'none', failure);
    assert.equal(error, '리뷰 생성에 실패했습니다.');
  }
});

test('missing or whitespace-only required fields prevent all API calls', async () => {
  for (const field of ['title', 'product', 'category', 'duration']) {
    for (const value of ['', '   ']) {
      const { requests, uploaded, error } = await run(false, false, 'none', false, { [field]: value });
      assert.deepEqual(requests, []);
      assert.equal(uploaded.length, 0);
      assert.match(error, /필수 항목과 평점 범위를 확인해 주세요/);
    }
  }
});

test('invalid ratings prevent uploading images or posting the review', async () => {
  for (const rating of [-1, 5.1, NaN, Infinity]) {
    const { requests, uploaded, error } = await run(false, false, 'both', false, { rating });
    assert.deepEqual(requests, []);
    assert.deepEqual(uploaded, []);
    assert.match(error, /필수 항목과 평점 범위를 확인해 주세요/);
  }
});

test('direct submission also rejects invalid ratings before making API calls', async () => {
  let requests = 0;
  const submission = load(root + '_lib/review-submission.ts', {
    './review-api': { postReview: () => { requests++; } },
    './review-limits': limits, './review-validation': validationModule.exports,
    './local-images': helpers.exports,
  });
  await assert.rejects(submission.createReview({
    title: 'Title', product: 'Product', category: { id: 42, category: '리빙' },
    duration: '3 months', rating: -0.1, image: '', body: { type: 'doc', content: [] },
  }, new Map()), /필수 항목과 평점을 확인해 주세요/);
  assert.equal(requests, 0);
});

test('a zero rating is sent to the server unchanged', async () => {
  const { payload, requests, error } = await run(false, false, 'none', false, { rating: 0 });
  assert.equal(error, '');
  assert.deepEqual(requests, ['reviews']);
  assert.equal(payload.rating, 0);
});

test('every failed stage emits one alert, enters the error state, and does not retry', async () => {
  const failures = [
    await run(false, false, 'both', false, {}, new Error('Presigned URL failure')),
    await run(true),
    await run(false, false, 'none', new Error('Review failure')),
  ];
  for (const result of failures) {
    assert.deepEqual(result.alerts, [result.error]);
    assert(result.statuses.includes('pending'));
    assert.equal(result.statuses.at(-1), 'error');
    assert.equal(result.busy, false);
    assert.equal(result.requests.length, 1);
  }
  assert.equal(failures[0].uploaded.length, 0);
  assert.equal(failures[1].payload, undefined);
});

test('successful mutations finish with a success state and do not show an alert', async () => {
  const result = await run();
  assert(result.statuses.includes('pending'));
  assert.equal(result.statuses.at(-1), 'success');
  assert.equal(result.busy, false);
  assert.deepEqual(result.alerts, []);
});

test('body image counting includes nested images and repeated sources', () => {
  const image = { type: 'image', attrs: { src: 'same-key' } };
  assert.equal(limits.countBodyImages({ type: 'doc', content: [image,
    { type: 'blockquote', content: [image, image] }] }), 3);
});

test('content limits reject oversized reviews before API calls and accept the exact boundaries', async () => {
  const requests = [];
  const submission = load(root + '_lib/review-submission.ts', {
    './review-api': { postReview: async (payload) => { requests.push(payload); } },
    './review-limits': limits,
    './review-validation': validationModule.exports,
    './local-images': helpers.exports,
  });
  const makeReview = (images, characters) => ({
    title: 'Title', product: 'Product', category: { id: 42, category: '리빙' },
    duration: '3 months', rating: 0, image: '', verdict: '가'.repeat(characters),
    body: { type: 'doc', content: Array.from({ length: images }, () => ({
      type: 'image', attrs: { src: 'existing-key' },
    })) },
  });
  await assert.rejects(submission.createReview(makeReview(11, 500), new Map()), /최대 10개/);
  await assert.rejects(submission.createReview(makeReview(10, 501), new Map()), /최대 500자/);
  assert.equal(requests.length, 0);
  await submission.createReview(makeReview(10, 500), new Map());
  assert.equal(requests.length, 1);
  assert.equal(requests[0].verdict.length, 500);
  assert.equal(limits.countBodyImages(requests[0].body), 10);
});
