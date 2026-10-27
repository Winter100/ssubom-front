// Run against a dedicated Chromium profile with --remote-debugging-port=9225.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tabs = await (await fetch('http://localhost:9225/json/list')).json();
const tab = tabs.find((item) => item.type === 'page');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('close', (event) => {
  for (const task of pending.values()) task.reject(new Error(`Browser connection closed: ${event.code} ${event.reason}`));
});
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
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
};
const clickText = (text) => evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes(${JSON.stringify(text)})).click()`);
const typeIn = async (selector, text) => {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await send('Input.insertText', { text });
};

try {
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/reviews/new' });
  await waitFor(`document.querySelector('[contenteditable="true"]')`);
  await evaluate(`localStorage.removeItem('sseobom:review-draft:v1')`);
  await send('Page.reload');
  await waitFor(`document.querySelector('[contenteditable="true"]')`);
  await evaluate(`{
    window.revokedImages = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (source) => { window.revokedImages.push(source); revoke(source); };
    const log = console.log.bind(console);
    console.log = (...args) => { if (args[0] === '리뷰 전송 데이터') window.submittedReview = args[1]; log(...args); };
  }`);
  await typeIn('input[maxlength="100"]', '매일 써본 나의 리뷰');
  await typeIn('input[maxlength="80"]', '테스트 상품');
  await typeIn('input[maxlength="20"]', '테스트 작성자');
  await typeIn('input[maxlength="30"]', '3개월 사용');
  await evaluate(`{ const style = document.querySelector('[aria-label="본문 편집 도구"] select'); style.value = '2'; style.dispatchEvent(new Event('change', { bubbles: true })); }`);
  await typeIn('[contenteditable="true"]', '직접 써보니 좋았어요');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await evaluate(`{ const style = document.querySelector('[aria-label="본문 편집 도구"] select'); style.value = 'paragraph'; style.dispatchEvent(new Event('change', { bubbles: true })); }`);
  await typeIn('[contenteditable="true"]', '편안한 사용감에 대한 솔직한 이야기입니다.');
  await evaluate(`document.querySelector('button[aria-label="굵게"]').click()`);
  await typeIn('[contenteditable="true"]', '강조한 문장');
  await evaluate(`document.querySelector('button[aria-label="굵게"]').click()`);
  await typeIn('input[maxlength="200"]', '가벼워요');
  await typeIn('textarea', '매일 사용하는 분께 추천해요.');
  await evaluate(`const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), c => c.charCodeAt(0)); const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'cover.png', { type: 'image/png' })); const input = document.querySelector('[aria-label="대표 이미지 선택"]'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));`);
  await waitFor(`document.querySelector('img[alt="선택한 대표 이미지"]')`);
  await evaluate(`{ const bodyTransfer = new DataTransfer(); bodyTransfer.items.add(new File([bytes], 'body.png', { type: 'image/png' })); const input = document.querySelector('[aria-label="본문 이미지 선택"]'); input.files = bodyTransfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); }`);
  await waitFor(`document.querySelector('[contenteditable="true"] img')`);
  assert(await evaluate(`document.querySelector('img[alt="선택한 대표 이미지"]').src.startsWith('blob:')`));
  assert(await evaluate(`document.querySelector('[contenteditable="true"] img').src.startsWith('blob:')`));
  await clickText('전송');
  await waitFor(`document.querySelector('article .tiptap img')`);
  assert(await evaluate(`window.submittedReview.image instanceof File && window.submittedReview.image.name === 'cover.png'`));
  assert(await evaluate(`window.submittedReview.bodyImages.length === 1 && window.submittedReview.bodyImages[0].file instanceof File && window.submittedReview.bodyImages[0].file.name === 'body.png'`));
  assert(await evaluate(`document.querySelector('article .tiptap img').src.startsWith('blob:')`));
  await clickText('이어서 작성');
  await clickText('미리보기');
  await waitFor(`document.querySelector('article h1')?.textContent === '매일 써본 나의 리뷰'`);
  await waitFor(`document.querySelector('article .tiptap h2')?.textContent === '직접 써보니 좋았어요'`);
  assert(await evaluate(`document.querySelector('article').textContent.includes('가벼워요')`));
  assert.equal(await evaluate(`document.querySelector('article .tiptap strong')?.textContent`), '강조한 문장');
  assert(await evaluate(`document.querySelector('article .tiptap img') !== null`));
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('article .tiptap h2')).fontSize`), '20px');
  await clickText('이어서 작성');
  await clickText('임시 저장');
  await waitFor(`document.querySelector('[role="status"]').textContent.includes('임시 저장했습니다')`);
  await send('Page.reload');
  await waitFor(`document.querySelector('input[maxlength="100"]')?.value === '매일 써본 나의 리뷰'`);
  assert(await evaluate(`document.querySelector('[contenteditable="true"]').textContent.includes('직접 써보니 좋았어요')`));
  assert(await evaluate(`document.querySelector('[contenteditable="true"] img') !== null`));
  assert(await evaluate(`document.querySelector('img[alt="선택한 대표 이미지"]') !== null`));
  assert(await evaluate(`document.querySelector('img[alt="선택한 대표 이미지"]').src.startsWith('blob:')`));
  assert(await evaluate(`document.querySelector('[contenteditable="true"] img').src.startsWith('blob:')`));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  await clickText('미리보기');
  await waitFor(`document.querySelector('article .tiptap h2')`);
  assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const screenshotPath = path.join(os.tmpdir(), 'sseobom-writer-preview.png');
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  assert.deepEqual(errors, []);
  await clickText('이어서 작성');
  await evaluate(`{
    window.revokedImages = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (source) => { window.revokedImages.push(source); revoke(source); };
    window.coverSource = document.querySelector('img[alt="선택한 대표 이미지"]').src;
    window.bodySource = document.querySelector('[contenteditable="true"] img').src;
  }`);
  await clickText('대표 이미지 삭제');
  await waitFor(`window.revokedImages.includes(window.coverSource)`);
  assert(await evaluate(`!window.revokedImages.includes(window.bodySource)`));
  await evaluate(`document.querySelector('a[href="/"]').click()`);
  await waitFor(`window.revokedImages.includes(window.bodySource)`);
  console.log('PASS: Tiptap typing, Blob previews, original File submission, draft save/reload, URL cleanup, mobile overflow, runtime errors');
  console.log(`Screenshot: ${screenshotPath}`);
} finally {
  socket.close();
}
