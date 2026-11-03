// The fixed port targets an isolated H2 backend, never the development database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import ts from 'typescript';

const baseURL = 'http://127.0.0.1:18080/api/v1/';
const dependency = createRequire(import.meta.url);
const modules = new Map();
let accessToken = null;
const load = (filename) => {
  const resolved = path.resolve(filename);
  if (modules.has(resolved)) return modules.get(resolved);
  const compiled = { exports: {} };
  modules.set(resolved, compiled.exports);
  const source = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)((name) => {
    if (name === '@/_features/auth/stores/tokenStore') return {
      getAccessToken: () => accessToken, setAccessToken: (value) => { accessToken = value; }, getTokenRevision: () => 0,
    };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), `${name}.ts`));
    return dependency(name);
  }, compiled, compiled.exports);
  return compiled.exports;
};
const { api } = load('_lib/api/api.ts');
api.defaults.baseURL = baseURL;
const { commentApi } = load('_features/review/lib/comment-api.ts');
const raw = axios.create({ baseURL, validateStatus: () => true, timeout: 10000 });
const password = `Cmt${randomUUID().slice(0, 12)}!`;
const accounts = [];
for (let index = 0; index < 2; index++) {
  const email = `cmt-${randomUUID().slice(0, 12)}@example.com`;
  const signup = await raw.post('auth/signup', { email, password, nickname: `cmt-${randomUUID().slice(0, 10)}` });
  assert.equal(signup.status, 201, JSON.stringify(signup.data));
  const login = await raw.post('auth/login', { email, password });
  assert.equal(login.status, 200);
  accounts.push(login.data);
}
let reviewId;
try {
  accessToken = accounts[0].accessToken;
  const categories = await raw.get('categories');
  const created = await api.post('reviews', {
    title: 'comment API verification', product: 'test product',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    rating: 4, categoryId: categories.data[0].id,
    mainImageKey: null, subImageKeys: [], duration: 'test', pros: [], cons: [], verdict: '',
  });
  assert.equal(created.status, 201);
  const mine = await api.get('member/reviews', { params: { page: 1, size: 1 } });
  reviewId = String(mine.data.content[0].id);
  const endpoint = `reviews/${reviewId}/comments`;
  const root = await commentApi.create(reviewId, { content: 'x'.repeat(1000), parentId: null });
  assert.equal(root.author.id, accounts[0].user.id);
  assert.equal(root.content.length, 1000);
  const reply = await commentApi.create(reviewId, { content: 'owner reply', parentId: root.id });
  accessToken = accounts[1].accessToken;
  const headers = { Authorization: `Bearer ${accessToken}` };
  assert.equal((await raw.put(`${endpoint}/${root.id}`, { content: 'not allowed' }, { headers })).status, 403);
  assert.equal((await raw.delete(`${endpoint}/${root.id}`, { headers })).status, 403);
  const otherReply = await commentApi.create(reviewId, { content: 'other reply', parentId: reply.id });
  assert.equal(otherReply.parentId, root.id);
  for (const content of ['   ', 'x'.repeat(1001)]) {
    assert.equal((await raw.post(endpoint, { content, parentId: null }, { headers })).status, 400);
  }
  assert.equal((await raw.post(endpoint, { content: 'anonymous', parentId: null })).status, 401);
  assert.equal((await raw.put(`${endpoint}/${root.id}`, { content: 'anonymous' })).status, 401);
  assert.equal((await raw.delete(`${endpoint}/${root.id}`)).status, 401);
  accessToken = accounts[0].accessToken;
  assert.equal(await commentApi.update(reviewId, root.id, 'edited root'), undefined);
  const beforeDelete = await commentApi.list(reviewId, 1, 20);
  assert.equal(beforeDelete.content[0].content, 'edited root');
  assert.equal(beforeDelete.content[0].replies.length, 2);
  assert.equal(await commentApi.remove(reviewId, root.id), undefined);
  const deleted = (await commentApi.list(reviewId, 1, 20)).content[0];
  assert.equal(deleted.author, null);
  assert.equal(deleted.deleted, true);
  assert.equal(deleted.content, '삭제된 댓글입니다');
  assert.equal(deleted.replies.length, 2);
  assert.equal(deleted.createdAt, root.createdAt);
  assert.equal((await raw.put(`${endpoint}/${root.id}`, { content: 'already deleted' }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })).status, 409);
  for (let index = 0; index < 21; index++) {
    await commentApi.create(reviewId, { content: `page root ${index}`, parentId: null });
  }
  const first = await commentApi.list(reviewId, 1, 20);
  const second = await commentApi.list(reviewId, 2, 20);
  assert.equal(first.totalElements, 22);
  assert.equal(first.totalPages, 2);
  assert.equal(first.content.length, 20);
  assert.equal(second.content.length, 2);
  assert.equal(new Set([...first.content, ...second.content].map(({ id }) => id)).size, 22);
  assert.equal((await raw.get(endpoint)).status, 200);
  if (process.env.COMMENT_BROWSER_FIXTURE_PATH) {
    fs.writeFileSync(process.env.COMMENT_BROWSER_FIXTURE_PATH, JSON.stringify({
      reviewId, email: accounts[0].user.email, password, user: accounts[0].user,
      accessToken: accounts[0].accessToken,
    }));
  }
  console.log('Live API passed: two accounts, ownership/anonymous access, create/reply/update/delete, 1000-char limit, deleted author/replies, 22 roots across two pages.');
} finally {
  accessToken = accounts[0].accessToken;
  if (reviewId && !process.env.COMMENT_BROWSER_FIXTURE_PATH) await api.delete(`reviews/${reviewId}`);
}
