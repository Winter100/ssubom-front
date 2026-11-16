import assert from 'node:assert/strict';

// Match the public categories prefetched by the Next.js server during SSR.
const categories = await (await fetch('http://localhost:8080/api/v1/categories')).json();

const tabs = await (await fetch('http://localhost:9227/json/list')).json();
const socket = new WebSocket(tabs.find(({ type }) => type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
let reserved = false;
const pending = new Map();
const errors = [];
const user = { id: 1, nickname: '탈퇴 테스트', email: 'withdrawal@example.com', createdAt: '2026-11-01T00:00:00Z', nicknameChangedAt: null };
const calls = [];
let releaseMember;
const memberGate = new Promise((resolve) => { releaseMember = resolve; });
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Inspector.targetCrashed') errors.push('Browser target crashed');
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
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
  throw new Error(`UI timeout: ${expression}; errors: ${JSON.stringify(errors)}`);
};
const respond = async ({ requestId, request }) => {
  const path = new URL(request.url).pathname;
  if (path.endsWith('/member')) await memberGate;
  let code = 200;
  let data = {};
  if (request.method === 'OPTIONS') code = 204;
  else if ((path.includes('/member') || path.endsWith('/auth/withdrawal')) &&
    !(request.headers.Authorization ?? request.headers.authorization)) {
    code = 401;
    data = { message: '인증이 필요합니다.' };
  }
  else if (path.endsWith('/auth/refresh')) data = { accessToken: 'withdrawal-test-token' };
  else if (path.endsWith('/auth/withdrawal')) {
    assert.equal(request.headers.Authorization ?? request.headers.authorization, 'Bearer withdrawal-test-token');
    if (request.method === 'POST') {
      calls.push(JSON.parse(request.postData));
      if (JSON.parse(request.postData).password !== 'correct-password') {
        code = 400;
        data = { message: '현재 비밀번호가 일치하지 않습니다.' };
      } else reserved = true;
    }
    if (request.method === 'DELETE') { reserved = false; code = 204; }
    if (code === 200) data = reserved
      ? { requestedAt: '2026-11-16T06:00:00Z', scheduledAt: '2026-11-17T15:00:00Z' }
      : { requestedAt: null, scheduledAt: null };
  } else if (path.endsWith('/member')) data = user;
  else if (path.endsWith('/member/count')) data = [{ categoryId: 3, category: '리빙', count: 1 }];
  else if (path.endsWith('/categories')) data = categories;
  else if (path.endsWith('/reviews/42') || path.endsWith('/reviews/42/edit')) data = {
    id: 42, title: '탈퇴 테스트 리뷰', product: '상품', author: user,
    category: categories[0], rating: 4, createdAt: '2026-11-01T00:00:00Z',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문 보존' }] }] },
    duration: '', pros: [], cons: [], verdict: '', mainImageKey: null, viewCount: 0, likeCount: 0, isLike: false,
  };
  else if (path.endsWith('/reviews/42/comments')) data = {
    content: [{ id: 1, parentId: null, content: '기존 댓글', deleted: false,
      createdAt: '2026-11-01T00:00:00Z', author: user, replies: [] }],
    page: 1, size: 20, totalElements: 1, totalPages: 1,
  };
  else if (path.endsWith('/member/reviews')) data = {
    content: [{ id: 42, title: '탈퇴 테스트 리뷰', product: '상품', category: { id: 3, category: '리빙' },
      rating: 4, createdAt: '2026-11-01T00:00:00Z', author: user, mainImageKey: null,
      likeCount: 0, viewCount: 0 }],
    page: 1, size: 15, totalPages: 1, totalElements: 1,
  };
  await send('Fetch.fulfillRequest', {
    requestId, responseCode: code,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
      { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
      { name: 'Access-Control-Allow-Methods', value: 'GET,POST,DELETE,OPTIONS' },
    ],
    ...(code === 204 ? {} : { body: Buffer.from(JSON.stringify(data)).toString('base64') }),
  });
};
const fill = (value) => evaluate(`(() => {
  const input = document.querySelector('#withdrawal-password');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
const clickText = (text) => evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)});
  if (!button) throw new Error('Button missing: '+${JSON.stringify(text)});
  button.click();
})()`);

try {
  await send('Runtime.enable');
  await send('Inspector.enable');
  await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:8080/api/v1/*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('hasSession','1')" });
  await send('Page.navigate', { url: 'http://localhost:3000/mypage' });
  await waitFor(`document.querySelector('[data-loading-spinner]')`);
  await waitFor(`getComputedStyle(document.querySelector('[data-loading-spinner]')).position === 'fixed'`);
  const spinner = await evaluate(`(() => {
    const style = getComputedStyle(document.querySelector('[data-loading-spinner]'));
    return { position: style.position, top: parseFloat(style.top), left: parseFloat(style.left),
      width: parseFloat(style.width), height: parseFloat(style.height), animation: style.animationName,
      viewportWidth: document.documentElement.clientWidth, viewportHeight: innerHeight, content: style.content };
  })()`);
  assert.equal(spinner.position, 'fixed');
  assert.equal(spinner.animation, 'loading-spin');
  assert.equal(spinner.width, 40);
  assert.equal(spinner.height, 40);
  assert.ok(Math.abs(spinner.top - spinner.viewportHeight / 2) < 1);
  assert.ok(Math.abs(spinner.left - spinner.viewportWidth / 2) < 1);
  assert.ok(!await evaluate(`document.body.innerText.includes('로그인 상태를 확인하고')`));
  releaseMember();
  await waitFor(`document.querySelector('section[aria-label="회원 탈퇴"] button[aria-haspopup="dialog"]')`);
  await waitFor(`!document.querySelector('[data-loading-spinner]')`);
  assert.equal(await evaluate(`(() => {
    const hidden = document.createElement('div');
    hidden.style.display = 'none';
    hidden.innerHTML = '<span class="loading-spinner" data-loading-spinner></span>';
    document.body.append(hidden);
    const noGlobalSpinner = getComputedStyle(document.body, '::after').content === 'none';
    const hiddenSpinner = hidden.firstElementChild.getClientRects().length === 0;
    hidden.remove();
    return noGlobalSpinner && hiddenSpinner;
  })()`), true);
  await clickText('회원 탈퇴');
  await waitFor(`document.querySelector('dialog[open] #withdrawal-password')`);
  assert.equal(await evaluate(`document.querySelector('dialog[open] button[type="submit"]').disabled`), true);
  assert.ok(await evaluate(`document.querySelector('dialog[open]').textContent.includes('모든 게시글(리뷰)은 자동으로 삭제')`));
  await fill('wrong');
  await clickText('탈퇴 예약하기');
  await waitFor(`document.querySelector('#withdrawal-error')?.textContent.includes('비밀번호가 일치하지 않습니다')`);
  assert.equal(await evaluate(`document.querySelector('#withdrawal-password').value`), '');
  assert.equal(await evaluate(`document.activeElement.id`), 'withdrawal-password');
  await fill('correct-password');
  await clickText('탈퇴 예약하기');
  await waitFor(`!document.querySelector('dialog[open]') && document.querySelector('section[aria-label="회원 탈퇴"]').textContent.includes('탈퇴 예정')`);
  assert.equal(calls.length, 2);
  assert.equal(await evaluate(`location.pathname`), '/mypage');
  assert.ok(await evaluate(`document.querySelector('button[aria-label="탈퇴 테스트 리뷰 수정"]').disabled`));
  assert.ok(await evaluate(`document.querySelector('button[aria-label="탈퇴 테스트 리뷰 삭제"]').disabled`));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await clickText('탈퇴 예약 취소');
  await waitFor(`document.querySelector('dialog[open]')`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  await clickText('닫기');
  await waitFor(`!document.querySelector('dialog[open]')`);
  assert.equal(await evaluate(`document.activeElement.textContent.trim()`), '탈퇴 예약 취소');
  assert.equal(await evaluate(`[...document.querySelectorAll('header button')].find(button => button.textContent.trim() === '리뷰 쓰기')?.disabled`), true);
  await evaluate(`document.querySelector('header details').open = true`);
  await evaluate(`[...document.querySelectorAll('header button')].find(button => button.textContent.trim() === '리뷰 쓰기').click()`);
  assert.equal(await evaluate(`location.pathname`), '/mypage');
  for (let attempt = 0; attempt < 3; attempt++) {
    const previousOrigin = await evaluate('performance.timeOrigin');
    await send('Page.navigate', { url: 'http://localhost:3000/reviews/new' });
    await waitFor(`performance.timeOrigin !== ${previousOrigin} && location.pathname === '/mypage' && document.querySelector('section[aria-label="회원 탈퇴"]')`);
    assert.equal(await evaluate(`document.querySelector('.ProseMirror')`), null);
  }
  await send('Page.navigate', { url: 'http://localhost:3000/reviews/edit/42' });
  await waitFor(`document.querySelector('fieldset[disabled]') && document.body.textContent.includes('본문 보존')`);
  await send('Page.navigate', { url: 'http://localhost:3000/reviews/42' });
  await waitFor(`document.querySelector('#review-comments textarea') && document.querySelector('#review-comments button')`);
  assert.equal(await evaluate(`document.querySelector('#review-comments textarea').disabled`), true);
  await waitFor(`[...document.querySelectorAll('#review-comments button')].some(button => button.textContent.trim() === '답글 달기')`);
  assert.equal(await evaluate(`[...document.querySelectorAll('#review-comments button')].find(button => button.textContent.trim() === '답글 달기').disabled`), true);
  assert.equal(await evaluate(`[...document.querySelectorAll('#review-comments button')].find(button => button.textContent.trim() === '수정').disabled`), true);
  assert.equal(await evaluate(`[...document.querySelectorAll('#review-comments button')].find(button => button.textContent.trim() === '삭제').disabled`), true);
  assert.equal(await evaluate(`document.querySelector('button[aria-pressed]').disabled`), true);
  assert.ok(await evaluate(`document.body.textContent.includes('탈퇴 예약 중에는 변경할 수 없습니다')`));
  await send('Page.navigate', { url: 'http://localhost:3000/mypage' });
  await waitFor(`document.querySelector('section[aria-label="회원 탈퇴"]')?.textContent.includes('탈퇴 예정')`);
  await clickText('탈퇴 예약 취소');
  await waitFor(`document.querySelector('dialog[open] button[type="submit"]')?.textContent.trim() === '예약 취소하기'`);
  await clickText('예약 취소하기');
  await waitFor(`!document.querySelector('dialog[open]') && document.querySelector('section[aria-label="회원 탈퇴"] button[aria-haspopup="dialog"]')?.textContent.trim() === '회원 탈퇴'`);
  await waitFor(`!document.querySelector('button[aria-label="탈퇴 테스트 리뷰 수정"]').disabled`);
  assert.equal(reserved, false);
  await send('Page.navigate', { url: 'http://localhost:3000/reviews/new' });
  await waitFor(`document.querySelector('.ProseMirror[contenteditable="true"]')`);
  assert.equal(await evaluate('location.pathname'), '/reviews/new');
  // CDP intercepts browser requests only; the existing edit-page SSR request
  // reaches the real backend without this fixture's token and falls back to CSR.
  const unexpected = errors.filter((error) => !(
    error.startsWith('Error: Switched to client rendering because the server rendering errored:') &&
    error.includes('Object.getMyDetail') && error.includes('로그인이 만료')
  ));
  assert.deepEqual(unexpected, []);
  console.log('PASS: password mismatch, reservation, review actions, direct writer/edit access, comments/replies, mobile layout, focus return, cancellation');
} finally {
  await send('Fetch.disable');
  await send('Emulation.clearDeviceMetricsOverride');
  socket.close();
}
