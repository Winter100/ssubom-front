import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const dependency = createRequire(import.meta.url);
const source = ts.transpileModule(
  fs.readFileSync('_features/review/components/form/point-fields.tsx', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
const compiled = { exports: {} };
let focusRef;
new Function('require', 'module', 'exports', source)(
  (name) => name === 'react' ? { useRef: () => focusRef } : dependency(name),
  compiled, compiled.exports,
);
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
};

test('Enter and the add button append the same item for pros and cons, respecting composition and the limit', () => {
  for (const tone of ['green', 'sand']) {
    for (const length of [1, 9, 10]) {
      focusRef = { current: null };
      const items = Array.from({ length }, (_, index) => `item ${index}`);
      const changes = [];
      const tree = compiled.exports.default({ label: tone, tone, items, onChange: (next) => changes.push(next) });
      const input = find(tree, (node) => node.type === 'input');
      const add = find(tree, (node) => node.type === 'button' && 'disabled' in node.props);
      const press = (overrides = {}) => {
        let prevented = false;
        input.props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: false }, repeat: false,
          preventDefault: () => { prevented = true; }, ...overrides });
        return prevented;
      };
      assert.equal(press({ key: 'a' }), false);
      assert.equal(press({ nativeEvent: { isComposing: true } }), false);
      assert.equal(press({ repeat: true }), true);
      assert.equal(changes.length, 0);
      assert.equal(press(), true);
      assert.equal(focusRef.current, length < 10 ? length : null);
      add.props.onClick();
      assert.equal(add.props.disabled, length >= 10);
      assert.deepEqual(changes, length < 10 ? [[...items, ''], [...items, '']] : []);
    }
  }
});

test('Enter preserves text and focuses the appended input; blank input never adds an item', () => {
  for (const tone of ['green', 'sand']) {
    focusRef = { current: null };
    let items = ['작성한 내용'];
    const render = () => compiled.exports.default({ label: tone, tone, items, onChange: (next) => { items = next; } });
    const press = (tree) => find(tree, (node) => node.type === 'input').props.onKeyDown({
      key: 'Enter', nativeEvent: { isComposing: false }, repeat: false, preventDefault: () => {},
    });
    press(render());
    assert.deepEqual(items, ['작성한 내용', '']);
    const tree = render();
    const newInput = find(tree, (node) => node.type === 'input' && node.props.value === '');
    let focused = false;
    newInput.props.ref({ focus: () => { focused = true; } });
    assert.equal(focused, true);
    assert.equal(focusRef.current, null);
    for (const blank of ['', '   ']) {
      items = [blank];
      press(render());
      assert.deepEqual(items, [blank]);
      assert.equal(focusRef.current, null);
    }
  }
});
