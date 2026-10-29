import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import axios from 'axios';

const requireDependency = createRequire(import.meta.url);
const load = (file) => {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(requireDependency, compiled, compiled.exports);
  return compiled.exports;
};
const { getAuthErrorMessage } = load('_lib/auth-client.ts');
const { validateAuthField } = load('_lib/auth-validation.ts');
const failure = (status, data = {}) => new axios.AxiosError('failed', undefined, undefined, undefined, { status, data });
const valid = { email: ' reader@example.com ', password: '12345678', passwordConfirm: '12345678', nickname: ' 독자 ' };

test('email, password boundaries, confirmation, nickname validation', () => {
  for (const field of Object.keys(valid)) assert.equal(validateAuthField(field, valid), '');
  for (const email of ['', 'reader', 'a@', 'a b@example.com', 'a@example']) assert.ok(validateAuthField('email', { ...valid, email }));
  assert.ok(validateAuthField('password', { ...valid, password: '1234567' }));
  assert.equal(validateAuthField('password', { ...valid, password: ' 123456 ' }), '');
  assert.ok(validateAuthField('passwordConfirm', { ...valid, passwordConfirm: 'different' }));
  assert.ok(validateAuthField('nickname', { ...valid, nickname: '   ' }));
});

test('error messages support untrusted JSON, fallback, timeout, network failure', () => {
  assert.equal(getAuthErrorMessage(failure(400, { message: '이미 사용 중입니다.' }), '기본'), '이미 사용 중입니다.');
  for (const body of [null, 'error', { message: 42 }, { message: ' ' }]) assert.equal(getAuthErrorMessage(failure(400, body), '기본'), '기본');
  assert.match(getAuthErrorMessage(new axios.AxiosError('timeout', 'ECONNABORTED'), '기본'), /시간/);
  assert.match(getAuthErrorMessage(new axios.AxiosError('offline', 'ERR_NETWORK'), '기본'), /네트워크/);
});
