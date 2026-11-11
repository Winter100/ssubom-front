import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
};
const setup = (profileImage = '/old.png', save = async () => {}, nicknameChangedAt = null) => {
  const states = [];
  const refs = [];
  const effects = [];
  let cursor = 0;
  let refCursor = 0;
  const compiled = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('_features/my/components/profile-image-form.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const overrides = {
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useRef: (initial) => {
        const index = refCursor++;
        refs[index] ??= { current: initial };
        return refs[index];
      },
      useEffect: (effect) => effects.push(effect),
    },
    'next/image': { __esModule: true, default: 'img' },
    '@/_lib/auth-client': { getAuthErrorMessage: (error) => error.message },
    '../hooks/use-update-profile': { useUpdateProfile: () => ({ mutateAsync: save, isPending: false }) },
  };
  new Function('require', 'module', 'exports', source)(
    (name) => overrides[name] ?? dependency(name), compiled, compiled.exports,
  );
  const render = () => {
    cursor = 0;
    refCursor = 0;
    return compiled.exports.default({ profileImage, memberId: 7, nickname: '기존이름', nicknameChangedAt });
  };
  const select = (file) => find(render(), (node) => node.type === 'input' && node.props.type === 'file').props.onChange({
    currentTarget: { files: [file], value: 'selected' },
  });
  return { render, select, effects };
};

test('profile image form validates files and previews a valid selection; cancel restores the current image', () => {
  const view = setup();
  assert.equal(find(view.render(), (node) => node.type === 'img').props.src, '/old.png');
  for (const file of [
    new File(['x'], 'photo.gif', { type: 'image/gif' }),
    new File([], 'empty.png', { type: 'image/png' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
  ]) {
    view.select(file);
    assert.ok(find(view.render(), (node) => node.props?.role === 'alert'));
    assert.equal(find(view.render(), (node) => node.props?.type === 'submit').props.disabled, true);
  }
  view.select(new File(['photo'], 'photo.png', { type: 'image/png' }));
  assert.match(find(view.render(), (node) => node.type === 'img').props.src, /^blob:/);
  assert.equal(find(view.render(), (node) => node.props?.role === 'alert'), undefined);
  find(view.render(), (node) => node.type === 'button' && node.props.children === '취소').props.onClick();
  assert.equal(find(view.render(), (node) => node.type === 'img').props.src, '/old.png');
});

test('profile form saves a changed nickname and image and preserves the draft after failure', async () => {
  const calls = [];
  let fail = true;
  const view = setup(null, async (input) => {
    calls.push(input);
    if (fail) throw new Error('중복 닉네임');
  });
  assert.equal(find(view.render(), (node) => node.type === 'img').props.src, '/default-profile.svg');
  const submit = () => find(view.render(), (node) => node.type === 'form').props.onSubmit({ preventDefault: () => {} });
  find(view.render(), (node) => node.props?.id === 'profile-nickname').props.onChange({ currentTarget: { value: ' 새이름 ' } });
  view.select(new File(['photo'], 'photo.webp', { type: 'image/webp' }));
  await submit();
  assert.equal(calls[0].nickName, '새이름');
  assert.equal(calls[0].file.name, 'photo.webp');
  assert.equal(find(view.render(), (node) => node.props?.role === 'alert').props.children, '중복 닉네임');
  assert.equal(find(view.render(), (node) => node.props?.id === 'profile-nickname').props.value, ' 새이름 ');
  fail = false;
  await submit();
  assert.equal(find(view.render(), (node) => node.props?.role === 'alert'), undefined);
  assert.equal(find(view.render(), (node) => node.props?.role === 'status').props.children, '회원 정보를 수정했습니다.');
  const target = { srcset: 'old', src: 'broken' };
  find(view.render(), (node) => node.type === 'img').props.onError({ currentTarget: target });
  assert.deepEqual(target, { srcset: '', src: '/default-profile.svg' });
});

test('profile form rejects a blank nickname and prevents duplicate submissions', async () => {
  let complete;
  let calls = 0;
  const view = setup('/old.png', () => {
    calls++;
    return new Promise((resolve) => { complete = resolve; });
  });
  const changeName = (value) => find(view.render(), (node) => node.props?.id === 'profile-nickname').props.onChange({ currentTarget: { value } });
  const submit = () => find(view.render(), (node) => node.type === 'form').props.onSubmit({ preventDefault: () => {} });
  changeName('   ');
  await submit();
  assert.equal(calls, 0);
  assert.equal(find(view.render(), (node) => node.props?.role === 'alert').props.children, '닉네임을 입력해 주세요.');
  changeName('새이름');
  const pending = submit();
  await submit();
  assert.equal(calls, 1);
  complete();
  await pending;
});

test('nickname cooldown disables only the nickname input and submits only the selected image', async (context) => {
  context.mock.method(Date, 'now', () => Date.parse('2026-11-11T03:00:00Z'));
  const calls = [];
  const view = setup('/old.png', async (input) => { calls.push(input); }, '2026-11-10T03:00:00Z');
  const nicknameInput = () => find(view.render(), (node) => node.props?.id === 'profile-nickname');
  assert.equal(nicknameInput().props.disabled, true);
  assert.match(find(view.render(), (node) => node.props?.id === 'profile-nickname-help').props.children, /6일 0시간 0분/);
  assert.equal(find(view.render(), (node) => node.props?.type === 'file').props.disabled, false);
  // A draft left over from before the restriction must not be sent with the image.
  nicknameInput().props.onChange({ currentTarget: { value: '보내면 안 되는 이름' } });
  view.select(new File(['photo'], 'photo.png', { type: 'image/png' }));
  assert.equal(find(view.render(), (node) => node.props?.type === 'submit').props.disabled, false);
  await find(view.render(), (node) => node.type === 'form').props.onSubmit({ preventDefault: () => {} });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nickName, undefined);
  assert.equal(calls[0].file.name, 'photo.png');
});

test('nickname editing is available for a first change and exactly seven days after a previous change', (context) => {
  context.mock.method(Date, 'now', () => Date.parse('2026-11-11T03:00:00Z'));
  for (const changedAt of [null, '2026-11-04T03:00:00Z', '2026-11-01T03:00:00Z']) {
    const view = setup('/old.png', async () => {}, changedAt);
    assert.equal(find(view.render(), (node) => node.props?.id === 'profile-nickname').props.disabled, false);
  }
});

test('nickname input unlocks when the countdown reaches seven days without reloading', (context) => {
  const availableAt = Date.parse('2026-11-11T03:00:00Z');
  let now = availableAt - 1000;
  context.mock.method(Date, 'now', () => now);
  const previousWindow = globalThis.window;
  let tick;
  let cleared = false;
  globalThis.window = {
    setInterval: (callback) => { tick = callback; return 1; },
    clearInterval: () => { cleared = true; },
  };
  try {
    const view = setup('/old.png', async () => {}, '2026-11-04T03:00:00Z');
    assert.equal(find(view.render(), (node) => node.props?.id === 'profile-nickname').props.disabled, true);
    const cleanup = view.effects.at(-1)();
    now = availableAt;
    tick();
    assert.equal(find(view.render(), (node) => node.props?.id === 'profile-nickname').props.disabled, false);
    cleanup();
    assert.equal(cleared, true);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
