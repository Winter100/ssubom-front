import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, dependencies = {}) => {
  const source = ts.transpileModule(fs.readFileSync(`_features/review/${path}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const limits = load('lib/review-limits.ts');
const validation = load('lib/review-validation.ts', { './review-limits': limits });
const Basics = load('components/form/review-basics-fields.tsx', {
  '../../lib/review-limits': limits,
  '../../lib/review-validation': validation,
  '../../lib/category-icon': { getCategoryIcon: () => '' },
}).default;
const fields = { title: 'Title', product: 'Product', duration: '3 months',
  category: { id: 1, category: 'Category' }, rating: 4.5 };
const render = (values, showErrors = false) => renderToStaticMarkup(Basics({
  fields: values, categoryList: [fields.category], showErrors, changeField: () => {},
}));

test('required text fields expose matching input limits and live character counts', () => {
  for (const [field, max] of [['title', 30], ['product', 80], ['duration', 30]]) {
    for (const length of [0, 3, max]) {
      const markup = render({ ...fields, [field]: '가'.repeat(length) });
      assert.match(markup, new RegExp(`aria-describedby="review-${field}-count"[^>]*maxLength="${max}"`, 'i'));
      assert.match(markup, new RegExp(`id="review-${field}-count"[^>]*>${length}/${max}(?:자)?</span>`));
    }
  }
});

test('restored overlong values block submission and show a correction message', () => {
  for (const [field, max] of [['title', 30], ['product', 80], ['duration', 30]]) {
    assert.equal(validation.hasRequiredReviewFields({ ...fields, [field]: '가'.repeat(max) }), true);
    const overlong = { ...fields, [field]: '가'.repeat(max + 1) };
    assert.equal(validation.hasRequiredReviewFields(overlong), false);
    const markup = render(overlong, true);
    assert.match(markup, new RegExp(`id="review-${field}-error"[^>]*>최대 ${max}자까지 입력할 수 있습니다.`));
    assert.match(markup, new RegExp(`aria-invalid="true" aria-describedby="review-${field}-count review-${field}-error"`));
    assert.equal(validation.hasRequiredReviewFields({ ...fields, [field]: '  ' }), false);
  }
});
