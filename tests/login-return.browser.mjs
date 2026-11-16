// next dev on :3000; dedicated Chromium profile with --remote-debugging-port=9238.
// API responses are intercepted; no real login or database write is performed.
import assert from 'node:assert/strict';

const tabs = await (await fetch('http://localhost:9238/json/list')).json();
const socket = new WebSocket(tabs.find(({ type }) => type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
let failLogin = true;
const pending = new Map();
const errors = [];
const user = { id: 1, nickname: '복귀 테스트', email: 'return@example.com' };
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Fetch.requestPaused') {
    void respond(message.params).catch((error) => errors.push(error.message));
    return;
  }
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id);
  if (message.error) call.reject(new Error(message.error.message));
  else call.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timer); resolve(value); },
    reject: (error) => { clearTimeout(timer); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`UI timeout: ${expression}`);
};
const respond = async ({ requestId, request }) => {
  const url = new URL(request.url);
  let status = 200;
  let body = {};
  if (request.method === 'OPTIONS') status = 204;
  else if (url.pathname.endsWith('/auth/login')) {
    status = failLogin ? 401 : 200;
    body = failLogin ? { message: '로그인 실패 테스트' } : { user, accessToken: 'test-token' };
  } else if (url.pathname.endsWith('/member')) body = user;
  else if (url.pathname.endsWith('/categories')) body = [{ id: 3, category: '리빙' }];
  else if (url.pathname.endsWith('/reviews')) {
    body = { content: [], page: Number(url.searchParams.get('page') || 1), size: 10, totalPages: 3, totalElements: 30 };
  }
  await send('Fetch.fulfillRequest', {
    requestId, responseCode: status,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
      { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    ],
    body: Buffer.from(JSON.stringify(body)).toString('base64'),
  });
};
const fill = (selector, value) => evaluate(`(() => {
  const input = document.querySelector(${JSON.stringify(selector)});
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:8080/api/v1/*' }] });
  const original = '/reviews?page=2&categoryId=3#reviews';
  await send('Page.navigate', { url: `http://localhost:3000${original}` });
  await waitFor(`document.querySelector('header a[href="/login"]') && Object.keys(document.querySelector('header a[href="/login"]')).some(key => key.startsWith('__reactProps$'))`);
  await evaluate(`document.querySelector('header a[href="/login"]').click()`);
  await waitFor(`location.pathname === '/login' && document.querySelector('#email') && Object.keys(document.querySelector('form')).some(key => key.startsWith('__reactProps$'))`);
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('returnTo')`), original);
  await fill('#email', user.email);
  await fill('#password', 'password123');
  await evaluate(`document.querySelector('form button[type="submit"]').click()`);
  await waitFor(`document.querySelector('form [role="alert"]')?.textContent.includes('로그인 실패 테스트')`);
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('returnTo')`), original);
  failLogin = false;
  await evaluate(`document.querySelector('form button[type="submit"]').click()`);
  await waitFor(`location.pathname === '/reviews' && document.querySelector('header')?.textContent.includes(${JSON.stringify(user.nickname)})`);
  assert.equal(await evaluate('location.pathname + location.search + location.hash'), original);
  assert.deepEqual(errors, []);
  console.log('Browser passed: login click captures the original page, failed login retains returnTo, and successful login restores path, filters and hash. Mock API only.');
} finally {
  await send('Browser.close');
  socket.close();
}
