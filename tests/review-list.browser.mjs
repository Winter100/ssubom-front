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

let reviewMode = 'success';
let categoryMode = 'success';
let emptyAll = false;
const review = (id) => ({
  id, title: `리뷰 ${id}`, rating: 4.5, createdAt: '2026-10-24T09:00:00+09:00',
  category: { id: 3, category: '리빙' }, author: { id, nickname: `작성자 ${id}` },
  mainImageKey: null, content: { type: 'doc', content: [] },
});

socket.addEventListener('message', (event) => {
  const response = JSON.parse(event.data);
  if (response.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = response.params;
  const url = new URL(request.url);
  const isCategory = url.pathname.endsWith('/categories');
  if (!isCategory && (!url.pathname.endsWith('/reviews') || !url.searchParams.has('page'))) {
    void send('Fetch.continueRequest', { requestId }).catch((error) => {
      if (error.message !== 'Invalid InterceptionId.') errors.push(error.message);
    });
    return;
  }
  const page = Number(url.searchParams.get('page'));
  const size = Number(url.searchParams.get('size'));
  const empty = emptyAll || url.searchParams.get('query') === 'empty';
  const failed = isCategory ? categoryMode === 'error' : reviewMode === 'error';
  const body = isCategory
    ? [{ id: 3, category: '리빙' }, { id: 8, category: '디지털' }]
    : {
        content: empty || page > 100 ? [] : Array.from({ length: size }, (_, index) => review((page - 1) * size + index + 1)),
        page, size, totalElements: empty ? 0 : 1000, totalPages: empty ? 0 : 100,
      };
  if (!isCategory) requests.push(Object.fromEntries(url.searchParams));
  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await send('Fetch.fulfillRequest', {
      requestId, responseCode: failed ? 500 : 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
      body: Buffer.from(JSON.stringify(body)).toString('base64'),
    });
  })().catch((error) => errors.push(error.message));
});

const cards = "[...document.querySelectorAll('#reviews article')].filter(card => card.checkVisibility())";
const skeletons = "[...document.querySelectorAll('#reviews [data-review-skeleton]')].filter(card => card.checkVisibility())";
const params = 'new URLSearchParams(location.search)';
const search = "document.querySelector('input[name=query]')";
const submit = async (value, enter = true) => {
  await evaluate(`${search}.value = ''; ${search}.focus()`);
  await send('Input.insertText', { text: value });
  if (enter) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  } else {
    await evaluate("document.querySelector('button[type=submit]').click()");
  }
};
const visit = async (suffix) => {
  await navigate('Page.navigate', { url: `http://localhost:3100/reviews${suffix}` });
  await waitFor(`${search} !== null`);
};

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'XHR', requestStage: 'Request' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('Page.navigate', { url: 'about:blank' });
  await visit('?page=2&size=1&sort=rating&categoryId=3&query=초기&keep=yes#reviews');
  await waitFor(`${skeletons}.length === 10`);
  await waitFor(`${cards}.length === 10`);
  assert.deepEqual(requests[0], { page: '2', size: '10', categoryId: '3', query: '초기', sort: 'latest' });
  assert.equal(await evaluate("document.querySelectorAll('select').length"), 0);
  assert.equal(await evaluate("document.querySelector('h1').textContent.trim()"), '리뷰 둘러보기');
  assert(await evaluate("document.querySelector('[aria-label=\"리뷰 페이지 이동\"]').textContent.includes('…')"));
  await navigate('Page.reload');
  await waitFor(`${search}?.value === '초기' && ${cards}.length === 10`);
  await submit('한글 의자');
  await waitFor(`${params}.get('page') === '1' && ${search}?.defaultValue === '한글 의자' && ${cards}.length === 10`);
  assert.equal(await evaluate(`${params}.has('size') || ${params}.has('sort')`), false);
  assert.equal(await evaluate(`${params}.get('keep')`), 'yes');
  assert.equal(await evaluate('location.hash'), '#reviews');
  await evaluate('history.back()');
  await waitFor(`${params}.get('page') === '2' && ${search}?.value === '초기'`);
  await evaluate('history.forward()');
  await waitFor(`${search}?.value === '한글 의자'`);

  await waitFor("document.querySelector('button[aria-label=\"2페이지\"]')");
  await evaluate("document.querySelector('button[aria-label=\"2페이지\"]').click()");
  await waitFor(`${params}.get('page') === '2' && document.querySelector('button[aria-current=page]')?.textContent === '2'`);
  assert.equal(await evaluate(`${params}.get('query')`), '한글 의자');
  await evaluate("[...document.querySelectorAll('[aria-label=\"카테고리 필터\"] button')].find(el => el.textContent.trim() === '디지털').click()");
  await waitFor(`${params}.get('categoryId') === '8' && ${params}.get('page') === '1' && ${cards}.length === 10`);
  await submit('empty', false);
  await waitFor("document.querySelector('#reviews')?.textContent.includes('아직 일치하는 리뷰가 없어요')");
  await evaluate("[...document.querySelectorAll('#reviews button')].find(el => el.textContent.includes('검색·카테고리 초기화')).click()");
  await waitFor(`!${params}.has('query') && !${params}.has('categoryId') && ${cards}.length === 10`);

  await visit('?page=999');
  await waitFor(`${params}.get('page') === '100' && ${cards}.length === 10`);
  await visit('?page=5&query=empty');
  await waitFor(`${params}.get('page') === '1' && document.querySelector('#reviews')?.textContent.includes('아직 일치하는 리뷰가 없어요')`);
  emptyAll = true;
  await visit('?page=4');
  await waitFor(`${params}.get('page') === '1' && document.querySelector('#reviews')?.textContent.includes('아직 등록된 리뷰가 없습니다')`);
  assert.equal(await evaluate("document.querySelectorAll('[aria-label=\"리뷰 페이지 이동\"]').length"), 0);
  emptyAll = false;

  reviewMode = 'error';
  await navigate('Page.reload');
  await waitFor("document.querySelector('#reviews [role=alert] button')");
  reviewMode = 'success';
  await evaluate("document.querySelector('#reviews [role=alert] button').click()");
  await waitFor(`${cards}.length === 10`);
  categoryMode = 'error';
  await navigate('Page.reload');
  await waitFor("document.querySelector('#reviews')?.textContent.includes('카테고리 다시 시도')");
  assert.equal(await evaluate(`${cards}.length`), 10);
  categoryMode = 'success';
  await evaluate("[...document.querySelectorAll('#reviews button')].find(el => el.textContent.includes('카테고리 다시 시도')).click()");
  await waitFor("document.querySelector('[aria-label=\"카테고리 필터\"]').textContent.includes('디지털')");

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await visit('?page=50');
  await waitFor(`${cards}.length === 10`);
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  assert.equal(await evaluate("document.querySelectorAll('[aria-label=\"리뷰 페이지 이동\"] button').length"), 9);
  await visit('?page=1');
  await waitFor(`${cards}.length === 10`);
  await evaluate("document.querySelector('#reviews article h3 a').click()");
  await waitFor("location.pathname === '/reviews/1' && document.querySelector('h1')");

  await navigate('Page.navigate', { url: 'http://localhost:3100/' });
  await waitFor(`${cards}.length === 5`);
  assert(await evaluate("document.querySelector('header a[href=\"/reviews\"]') !== null"));
  assert(await evaluate("document.querySelector('#reviews a[href=\"/reviews\"]').textContent.includes('전체 리뷰 보기')"));
  await evaluate("document.querySelector('#reviews a[href=\"/reviews\"]').click()");
  await waitFor(`location.pathname === '/reviews' && ${cards}.length === 10`);
  assert.ok(requests.some((request) => request.size === '5' && request.sort === 'latest'));
  console.log('PASS: ten-item latest list, URL filters/history, skeletons, category/search, pagination bounds, retries, mobile, detail and home entry links');
} finally {
  await send('Fetch.disable');
  socket.close();
}
