import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);

test('detail back button returns to history or the review list for direct entry', () => {
  const calls = [];
  const source = ts.transpileModule(readFileSync('_features/review/components/detail/review-detail-back-button.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => name === 'next/navigation'
    ? { useRouter: () => ({ back: () => calls.push('back'), replace: (url) => calls.push(url) }) }
    : require(name), compiled, compiled.exports);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const length of [2, 1]) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { history: { length } } });
      const button = compiled.exports.default();
      assert.equal(button.props.type, 'button');
      assert.equal(button.props['aria-label'], '이전 페이지로 돌아가기');
      button.props.onClick();
    }
    assert.deepEqual(calls, ['back', '/reviews']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
});
