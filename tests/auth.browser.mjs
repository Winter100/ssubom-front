// Dedicated Chromium profile with --remote-debugging-port=9230; next dev on 3000.
import assert from 'node:assert/strict';

const connect = async () => {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      return await (await fetch('http://localhost:9230/json/list')).json();
    } catch (error) {
      if (attempt === 49) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
};
const tabs = await connect();
const tab = tabs.find((item) => item.type === 'page');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
const requests = [];
let session = false;
let failLogin = true;
let refreshStatus = 200;
const member = { id: 1, email: 'reader@example.com', nickname: '아주긴닉네임으로모바일헤더너비를확인하는독자입니다' };
const freshMember = { ...member, nickname: '최신닉네임으로갱신된독자입니다' };
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Fetch.requestPaused') {
    void respond(message.params).catch((error) => errors.push(error.message));
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  const task = pending.get(message.id);
  if (!task) return;
  pending.delete(message.id);
  if (message.error) task.reject(new Error(message.error.message));
  else task.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timer); resolve(value); },
    reject: (error) => { clearTimeout(timer); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const state = await evaluate(`({path: location.pathname, alert: document.querySelector('form [role="alert"]')?.textContent, invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map(input => input.id), header: document.querySelector('header')?.textContent})`);
  throw new Error(`Timed out: ${expression}; ${JSON.stringify(state)}; requests: ${requests.map((request) => `${request.method} ${new URL(request.url).pathname}`).join(', ')}`);
};

const respond = async ({ requestId, request }) => {
  const pathname = new URL(request.url).pathname;
  requests.push(request);
  let status = 200;
  let body = {};
  if (request.method === 'OPTIONS') {
    status = 204;
  } else if (pathname.endsWith('/member/refresh')) {
    status = session ? refreshStatus : 401;
    body = status === 200 ? { accessToken: 'restored-token' } : { message: '세션을 확인하지 못했습니다.' };
  } else if (pathname.endsWith('/member/login')) {
    status = failLogin ? 401 : 200;
    body = failLogin ? { message: '테스트 login 실패' } : { member, accessToken: 'login-token' };
    if (!failLogin) session = true;
  } else if (pathname.endsWith('/member/currentUser')) {
    assert.match(request.headers.Authorization ?? request.headers.authorization ?? '', /^Bearer (login|restored)-token$/);
    body = freshMember;
  } else if (pathname.endsWith('/reviews')) {
    body = { content: [], page: 1, size: 6, totalElements: 0, totalPages: 0 };
  } else if (pathname.endsWith('/categories')) {
    body = [];
  } else {
    await send('Fetch.continueRequest', { requestId });
    return;
  }
  await send('Fetch.fulfillRequest', {
    requestId,
    responseCode: status,
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

try {
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*member/*' }, { urlPattern: '*', resourceType: 'XHR' }, { urlPattern: '*', resourceType: 'Fetch' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000/login' });
  await waitFor(`document.querySelector('#email') && document.querySelector('header a[href="/login"]') && !document.querySelector('header [role="status"]')?.textContent.includes('확인 중')`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  assert.equal(await evaluate(`document.querySelector('header a[href="/reviews/new"]') === null`), true);
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await waitFor(`document.querySelector('#email-error')`);
  assert.equal(await evaluate(`document.activeElement.id`), 'email');
  assert.equal(await evaluate(`document.querySelector('#email').getAttribute('aria-describedby')`), 'email-error');
  await send('Input.insertText', { text: 'reader@example.com' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate(`document.activeElement.id`), 'password');
  await send('Input.insertText', { text: '12345678' });
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await waitFor(`document.querySelector('form [role="alert"]')`);
  assert.match(await evaluate(`document.querySelector('form [role="alert"]').textContent`), /login/);
  assert.equal(await evaluate(`document.querySelector('#password').value`), '12345678');
  await evaluate(`document.querySelector('a[href="/signup"]').click()`);
  await waitFor(`location.pathname === '/signup' && document.querySelector('#nickname')`);
  assert.equal(await evaluate(`document.querySelector('#nickname').closest('form').querySelectorAll('input').length`), 4);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  await evaluate(`document.querySelector('#nickname').closest('form').querySelector('button[type="submit"]').click()`);
  await waitFor(`document.querySelector('#nickname-error') && document.querySelector('#passwordConfirm-error')`);
  await send('Page.navigate', { url: 'http://localhost:3000/login?registered=1' });
  await waitFor(`document.querySelector('main [role="status"]')?.textContent.includes('회원가입이 완료')`);
  await waitFor(`document.querySelector('header a[href="/login"]') && !document.querySelector('header [role="status"]')`);
  failLogin = false;
  await evaluate(`document.querySelector('#email').focus()`);
  await send('Input.insertText', { text: member.email });
  await evaluate(`document.querySelector('#password').focus()`);
  await send('Input.insertText', { text: '12345678' });
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await waitFor(`location.pathname === '/' && document.querySelector('header a[href="/mypage"]')`);
  assert.equal(await evaluate(`document.querySelector('header a[href="/mypage"]').textContent.trim()`), member.nickname);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  assert.ok(await evaluate(`document.querySelector('header a[href="/mypage"]').getAttribute('aria-label').includes('마이페이지')`));
  assert.deepEqual(JSON.parse(requests.findLast((request) => new URL(request.url).pathname.endsWith('/member/login')).postData), { email: member.email, password: '12345678' });
  await evaluate(`document.querySelector('header a[href="/mypage"]').focus()`);
  assert.equal(await evaluate(`document.activeElement.getAttribute('href')`), '/mypage');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor(`location.pathname === '/mypage' && document.querySelector('dd')?.textContent === ${JSON.stringify(freshMember.nickname)}`);
  assert.equal(await evaluate(`document.querySelectorAll('dd')[1].textContent`), member.email);
  assert.equal(await evaluate(`document.querySelector('header a[href="/mypage"]').textContent.trim()`), freshMember.nickname);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  const beforeReload = requests.length;
  await send('Page.reload');
  await waitFor(`document.querySelector('dd')?.textContent === ${JSON.stringify(freshMember.nickname)}`);
  const restored = requests.slice(beforeReload).filter((request) => request.method !== 'OPTIONS' && /\/member\/(refresh|currentUser)$/.test(new URL(request.url).pathname));
  assert.ok(new URL(restored[0].url).pathname.endsWith('/member/refresh'));
  assert.ok(restored.some((request) => new URL(request.url).pathname.endsWith('/member/currentUser')));
  refreshStatus = 503;
  await send('Page.reload');
  await waitFor(`document.querySelector('main [role="alert"] a[href="/login"]')`);
  assert.equal(await evaluate(`location.pathname`), '/mypage');
  refreshStatus = 200;
  session = false;
  await send('Page.reload');
  await waitFor(`location.pathname === '/login' && document.querySelector('#email')`);
  assert.deepEqual(errors, []);
  console.log('Browser passed: form validation, nested login response, nickname/header, keyboard navigation to mypage, fresh user synchronization, refresh restore, outage and anonymous redirect, mobile long nickname. Mock API only.');
} finally {
  socket.close();
}
