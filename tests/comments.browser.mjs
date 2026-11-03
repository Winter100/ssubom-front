// Requires the dev server on :3000, isolated H2 API on :18080, and Chrome CDP on :9236.
// Generate the temporary fixture with COMMENT_BROWSER_FIXTURE_PATH and comment-api.live.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixture = JSON.parse(fs.readFileSync(process.env.COMMENT_BROWSER_FIXTURE_PATH, 'utf8'));
const tabs = await (await fetch('http://localhost:9236/json/list')).json();
const socket = new WebSocket(tabs.find(({ type }) => type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const requests = [];
const exceptions = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params;
    requests.push({ method: request.method, url: request.url });
    // H2 cannot execute the public detail endpoint's PostgreSQL ON CONFLICT query.
    // The edit endpoint supplies the same review body without incrementing views.
    if (request.method === 'GET' && new URL(request.url).pathname === `/api/v1/reviews/${fixture.reviewId}`) {
      void (async () => {
        const response = await fetch(`http://localhost:18080/api/v1/reviews/${fixture.reviewId}/edit`, {
          headers: { Authorization: `Bearer ${fixture.accessToken}` },
        });
        await send('Fetch.fulfillRequest', {
          requestId, responseCode: response.status,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
            { name: 'Access-Control-Allow-Credentials', value: 'true' },
          ],
          body: Buffer.from(await response.text()).toString('base64'),
        });
      })().catch((error) => exceptions.push(error.message));
      return;
    }
    void send('Fetch.continueRequest', {
      requestId, url: request.url.replace('localhost:8080', 'localhost:18080'),
    }).catch((error) => exceptions.push(error.message));
  }
  if (!message.id) return;
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id);
  if (message.error) call.reject(new Error(message.error.message));
  else call.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
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
  for (let attempt = 0; attempt < 180; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`UI timeout: ${expression}`);
};
const fill = (selector, value) => evaluate(`(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
  element.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const section = '#review-comments';
const articleButton = async (text, label) => {
  const target = `(() => {
    const article = [...document.querySelectorAll('#review-comments article')].find(element => element.textContent.includes(${JSON.stringify(text)}));
    return article && [...article.querySelectorAll('button')].find(element => element.textContent === ${JSON.stringify(label)} && !element.disabled);
  })()`;
  await waitFor(target);
  await evaluate(`${target}.click()`);
};

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.clearBrowserCookies');
  await evaluate('localStorage.clear()');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:8080/api/v1/*', requestStage: 'Request' }] });
  await send('Page.navigate', { url: 'http://localhost:3000/login' });
  await waitFor('document.querySelector("input[name=email]")');
  await waitFor(`Object.keys(document.querySelector('form') ?? {}).some(key => key.startsWith('__reactProps$'))`);
  await fill('input[name=email]', fixture.email);
  await fill('input[name=password]', fixture.password);
  await click('form button[type=submit]');
  await waitFor(`document.querySelector('header')?.textContent.includes(${JSON.stringify(fixture.user.nickname)})`);
  await send('Page.navigate', { url: `http://localhost:3000/reviews/${fixture.reviewId}` });
  await waitFor(`document.querySelectorAll('${section} article[aria-label="댓글"]').length === 20`);
  await waitFor(`document.querySelector('${section} form[aria-label="댓글 등록"]')`);
  const detailRequests = () => requests.filter(({ method, url }) => method === 'GET' && new URL(url).pathname === `/api/v1/reviews/${fixture.reviewId}`).length;
  const initialDetails = detailRequests();
  assert.equal(initialDetails, 1);

  await fill(`${section} form[aria-label="댓글 등록"] textarea`, '브라우저에서 등록한 댓글');
  await click(`${section} form[aria-label="댓글 등록"] button[type=submit]`);
  await waitFor(`document.querySelector('${section}').textContent.includes('방금 등록한 댓글') && document.querySelector('${section}').textContent.includes('브라우저에서 등록한 댓글')`);
  await articleButton('브라우저에서 등록한 댓글', '수정');
  await waitFor(`document.querySelector('${section} form[aria-label="수정 저장"]')`);
  await fill(`${section} form[aria-label="수정 저장"] textarea`, '브라우저에서 수정한 댓글');
  await click(`${section} form[aria-label="수정 저장"] button[type=submit]`);
  await waitFor(`document.querySelector('${section}').textContent.includes('브라우저에서 수정한 댓글')`);
  await articleButton('브라우저에서 수정한 댓글', '답글 달기');
  await waitFor(`document.querySelector('${section} form[aria-label="답글 등록"]')`);
  await fill(`${section} form[aria-label="답글 등록"] textarea`, '브라우저에서 등록한 답글');
  await click(`${section} form[aria-label="답글 등록"] button[type=submit]`);
  await waitFor(`document.querySelector('${section}').textContent.includes('브라우저에서 등록한 답글')`);
  await articleButton('브라우저에서 수정한 댓글', '삭제');
  await waitFor(`document.querySelector('${section} dialog[open]')`);
  await evaluate(`Array.from(document.querySelectorAll('${section} dialog button')).find(element => element.textContent === '삭제').click()`);
  await waitFor(`!document.querySelector('${section} dialog[open]')`);
  assert.equal(await evaluate(`document.querySelector('${section}').textContent.includes('브라우저에서 수정한 댓글')`), false);
  assert.equal(await evaluate(`document.querySelector('${section}').textContent.includes('브라우저에서 등록한 답글')`), true);
  await waitFor(`Array.from(document.querySelectorAll('${section} button')).some(element => element.textContent === '댓글 더 보기' && !element.disabled)`);
  await evaluate(`Array.from(document.querySelectorAll('${section} button')).find(element => element.textContent === '댓글 더 보기').click()`);
  await waitFor(`document.querySelectorAll('${section} article[aria-label="댓글"]').length === 23`);
  assert.equal(await evaluate(`document.querySelector('${section}').textContent.includes('방금 등록한 댓글')`), false);
  assert.equal(await evaluate(`document.querySelector('${section}').textContent.includes('댓글 더 보기')`), false);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await fill(`${section} form[aria-label="댓글 등록"] textarea`, '로그아웃하면 지워질 임시 입력');
  await evaluate(`Array.from(document.querySelectorAll('header button')).find(element => element.textContent.includes('로그아웃')).click()`);
  await waitFor(`!document.querySelector('${section} form')`);
  assert.equal(await evaluate(`document.querySelectorAll('${section} article[aria-label="댓글"]').length`), 23);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('${section} article button')).length`), 0);
  assert.equal(detailRequests(), initialDetails);
  assert.deepEqual(exceptions, []);
  console.log('Browser passed: login/profile, create/edit/reply/delete dialog, deleted replies, 20→23 roots with more, recent deduplication, mobile width, logout/draft reset, and no extra review-detail request.');
} finally {
  await send('Fetch.disable');
  socket.close();
}
