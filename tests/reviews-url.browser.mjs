// Requires a production server on port 3100 and a dedicated Chromium profile on port 9225.
import assert from 'node:assert/strict';

const tabs = await (await fetch('http://localhost:9225/json/list')).json();
const tab = tabs.find((item) => item.type === 'page');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
const requests = [];

socket.addEventListener('message', (event) => {
  const response = JSON.parse(event.data);
  if (response.method === 'Runtime.exceptionThrown') errors.push(response.params.exceptionDetails.text);
  if (!response.id) return;
  const task = pending.get(response.id);
  pending.delete(response.id);
  if (response.error) task.reject(new Error(response.error.message));
  else task.resolve(response.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser timeout: ${method}`)); }, 15000);
  pending.set(id, {
    resolve: (result) => { clearTimeout(timeout); resolve(result); },
    reject: (error) => { clearTimeout(timeout); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const state = await evaluate("({ url: location.href, query: document.querySelector('input[name=query]')?.value, defaultValue: document.querySelector('input[name=query]')?.defaultValue })");
  throw new Error(`Timed out: ${expression}; state=${JSON.stringify(state)}`);
};
const navigate = async (method, params = {}) => {
  const loaded = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.removeEventListener('message', listener); reject(new Error('Page load timeout')); }, 15000);
    const listener = (event) => {
      if (JSON.parse(event.data).method !== 'Page.loadEventFired') return;
      clearTimeout(timeout);
      socket.removeEventListener('message', listener);
      resolve();
    };
    socket.addEventListener('message', listener);
  });
  await send(method, params);
  await loaded;
};

let mode = 'success';
let count = 5;
const review = (id) => ({
  id, title: `최신 리뷰 ${id}`, rating: 4.5, createdAt: `2026-10-${25 - id}T09:00:00+09:00`,
  category: { id: 1, category: '리빙' }, author: { id, nickname: `작성자 ${id}` },
  mainImageKey: 'storage-key-is-not-a-url', content: { type: 'doc', content: [] },
});

socket.addEventListener('message', (event) => {
  const response = JSON.parse(event.data);
  if (response.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = response.params;
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/reviews') || !url.searchParams.has('page')) {
    void send('Fetch.continueRequest', { requestId }).catch((error) => {
      if (error.message !== 'Invalid InterceptionId.') errors.push(error.message);
    });
    return;
  }
  requests.push(Object.fromEntries(url.searchParams));
  const requestMode = mode;
  const responseCount = count;
  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const data = { content: Array.from({ length: responseCount }, (_, index) => review(index + 1)), page: 1, size: 5, totalElements: responseCount, totalPages: responseCount ? 1 : 0 };
    await send('Fetch.fulfillRequest', {
      requestId, responseCode: requestMode === 'error' ? 500 : 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
      body: Buffer.from(JSON.stringify(requestMode === 'error' ? { message: 'Test failure' } : data)).toString('base64'),
    });
  })().catch((error) => errors.push(error.message));
});

const cards = "document.querySelectorAll('#reviews article')";
const skeletons = "document.querySelectorAll('#reviews [data-review-skeleton]')";
const reload = async () => {
  await navigate('Page.reload');
  await waitFor(`${skeletons}.length === 5`);
};

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'XHR', requestStage: 'Request' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('Page.navigate', { url: 'about:blank' });
  await navigate('Page.navigate', { url: 'http://localhost:3100/?page=99&size=1&categoryId=999&query=ignored&sort=rating' });
  await waitFor(`${skeletons}.length === 5`);
  assert(await evaluate("document.querySelector('#reviews-title').textContent.includes('요즘, 써본 이야기')"));
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  await waitFor(`${cards}.length === 5`);
  assert.deepEqual(requests[0], { page: '1', size: '5', sort: 'latest' });
  assert(await evaluate("document.querySelectorAll('#reviews form, #reviews select, #reviews nav').length === 0"));
  assert.deepEqual(await evaluate(`${cards}.length ? [...${cards}].map(card => card.querySelector('h3').textContent) : []`), Array.from({ length: 5 }, (_, index) => `최신 리뷰 ${index + 1}`));
  for (let index = 0; index < 5; index++) {
    await evaluate(`${cards}[${index}].querySelector('img').scrollIntoView()`);
    await waitFor(`${cards}[${index}].querySelector('img').complete && ${cards}[${index}].querySelector('img').naturalWidth > 0`);
  }
  assert.equal(await evaluate("document.querySelectorAll('#reviews img[src=\"/reviews/no-image.svg\"][alt=\"대표 이미지 없음\"]').length"), 5);
  assert.deepEqual(errors, []);

  // Cached background failure and remount policy are covered with QueryObserver in unit tests.
  mode = 'error';

  // A cold failure shows the boundary immediately, and reset permits a fresh request.
  await reload();
  await waitFor(`document.querySelector('#reviews [role=alert]')`);
  assert.equal(await evaluate(`${cards}.length`), 0);
  const beforeRetry = requests.length;
  mode = 'success';
  await evaluate("document.querySelector('#reviews [role=alert] button').click()");
  await waitFor(`${skeletons}.length === 5`);
  await waitFor(`${cards}.length === 5`);
  assert.ok(requests.length > beforeRetry);

  count = 2;
  await reload();
  await waitFor(`${cards}.length === 2`);
  count = 0;
  await reload();
  await waitFor(`document.querySelector('#reviews').textContent.includes('아직 등록된 리뷰가 없습니다')`);
  assert.equal(await evaluate(`${cards}.length`), 0);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  count = 5;
  await reload();
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  await waitFor(`${cards}.length === 5`);
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  console.log('PASS: fixed latest-five request, skeletons, default images, error boundary retry, fewer/empty responses and mobile layout');
} finally {
  await send('Fetch.disable');
  socket.close();
}
