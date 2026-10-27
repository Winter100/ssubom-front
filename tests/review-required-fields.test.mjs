import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const base = 'app/(route)/reviews/new/';
let attempted = false;
const load = (path, dependencies = {}) => {
  const source = ts.transpileModule(fs.readFileSync(base + path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiledModule, compiledModule.exports,
  );
  return compiledModule.exports;
};
const limits = load('_lib/review-limits.ts');
const draft = load('_lib/draft.ts');
const { emptyFields } = load('_lib/review-types.ts');
const validation = load('_lib/review-validation.ts');
const categoryList = [
  { id: 11, category: '디지털' },
  { id: 42, category: '리빙' },
];
const Basics = load('_components/review-basics-fields.tsx', {
  '../_lib/review-validation': validation,
}).default;
const Form = load('_components/review-writer-form.tsx', {
  '../_lib/review-limits': limits,
  react: { useState: () => [attempted, (value) => { attempted = value; }] },
  '../_lib/review-validation': validation,
  ...Object.fromEntries(['review-basics-fields', 'review-cover-image', 'review-body-editor', 'point-fields']
    .map((name) => [`./${name}`, { default: () => null }])),
}).default;
const findSend = (element) => {
  if (!element || typeof element !== 'object') return undefined;
  if (element.type === 'button' && element.props.onClick) return element;
  return [element.props?.children].flat().map(findSend).find(Boolean);
};

test('submit stays enabled, blocks missing or whitespace fields, and allows complete fields', () => {
  let submissions = 0;
  const props = { fields: emptyFields, categoryList, readingImage: false, isSubmitting: false, editor: null,
    changeField: () => {}, handleImage: () => {}, submitReview: () => { submissions++; } };
  attempted = false;
  const button = findSend(Form(props));
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  assert.equal(attempted, true);
  assert.equal(submissions, 0);
  const complete = { ...emptyFields, title: 'Title', product: 'Product', category: categoryList[1], duration: '3 months', rating: 4.5 };
  findSend(Form({ ...props, fields: { ...complete, title: '  ' } })).props.onClick();
  assert.equal(submissions, 0);
  findSend(Form({ ...props, fields: complete })).props.onClick();
  assert.equal(submissions, 1);
  assert.equal(findSend(Form({ ...props, readingImage: true })).props.disabled, true);
  assert.equal(findSend(Form({ ...props, isSubmitting: true })).props.disabled, true);
});

test('field messages appear after submission and disappear when values are filled', () => {
  const render = (fields, showErrors) => renderToStaticMarkup(Basics({ fields, categoryList, showErrors, changeField: () => {} }));
  assert.equal((render(emptyFields, false).match(/role="alert"/g) ?? []).length, 0);
  const invalid = render(emptyFields, true);
  assert.equal((invalid.match(/role="alert"/g) ?? []).length, 4);
  assert.equal((invalid.match(/aria-hidden="true" class="text-red-600">\*/g) ?? []).length, 5);
  const valid = render({ ...emptyFields, title: 'Title', product: 'Product', category: categoryList[1], duration: '3 months', rating: 4.5 }, true);
  assert.equal((valid.match(/role="alert"/g) ?? []).length, 0);
});

test('category options display names and select objects by their server IDs', () => {
  let selected;
  const props = { fields: emptyFields, categoryList, showErrors: false,
    changeField: (key, value) => { assert.equal(key, 'category'); selected = value; } };
  const markup = renderToStaticMarkup(Basics(props));
  assert.match(markup, /<option value="11">디지털<\/option>/);
  assert.match(markup, /<option value="42">리빙<\/option>/);
  const findSelect = (element) => {
    if (!element || typeof element !== 'object') return undefined;
    if (element.type === 'select') return element;
    return [element.props?.children].flat().map(findSelect).find(Boolean);
  };
  const select = findSelect(Basics(props));
  assert.equal(select.props.value, '');
  select.props.onChange({ target: { value: '42' } });
  assert.deepEqual(selected, categoryList[1]);
  assert.equal(validation.hasRequiredReviewFields({ ...emptyFields,
    title: 'Title', product: 'Product', category: selected, duration: '3 months', rating: 4.5 }), true);
});

test('drafts preserve category objects and allow an unselected category', () => {
  const draftWithCategory = { ...emptyFields,
    category: categoryList[1], body: '{"type":"doc","content":[]}' };
  assert.deepEqual(draft.parseDraft(JSON.stringify(draftWithCategory)).category, categoryList[1]);
  assert.equal(draft.parseDraft(JSON.stringify({ ...draftWithCategory, category: null })).category, null);
  for (const category of ['리빙', 42, {}, { id: '42', category: '리빙' }, { id: 42 }]) {
    assert.throws(() => draft.parseDraft(JSON.stringify({ ...draftWithCategory, category })));
  }
});

test('zero rating is allowed in drafts and submissions without an error message', () => {
  const fields = { ...emptyFields, title: 'Title', product: 'Product',
    category: categoryList[1], duration: '3 months', rating: 0 };
  const saved = draft.parseDraft(JSON.stringify({ ...fields, body: '{"type":"doc","content":[]}' }));
  assert.equal(saved.rating, 0);
  assert.equal('author' in saved, false);
  assert.equal(validation.hasRequiredReviewFields(fields), true);
  let submissions = 0;
  attempted = false;
  const props = { fields, categoryList, readingImage: false, isSubmitting: false, editor: null,
    changeField: () => {}, handleImage: () => {}, submitReview: () => { submissions++; } };
  findSend(Form(props)).props.onClick();
  assert.equal(submissions, 1);
  const render = (rating) => renderToStaticMarkup(Basics({ fields: { ...fields, rating },
    categoryList, showErrors: attempted, changeField: () => {} }));
  assert.doesNotMatch(render(0), /role="alert"/);
  const invalid = render(-1);
  assert.match(invalid, /평점을 0~5점 사이로 설정해 주세요/);
  assert.match(invalid, /id="review-rating"[^>]*aria-invalid="true"/);
  assert.equal((invalid.match(/role="alert"/g) ?? []).length, 1);
  assert.doesNotMatch(render(0.1), /role="alert"/);
  assert.equal(validation.hasRequiredReviewFields({ ...fields, rating: 0.1 }), true);
  for (const rating of [-1, 5.1, NaN, Infinity]) {
    assert.equal(validation.isValidReviewRating(rating), false);
  }
  assert.equal(validation.isValidReviewRating(5), true);
});

test('rating buttons adjust by tenths without rounding drift and stay between zero and five', () => {
  let rating = 0;
  const findButton = (element, label) => {
    if (!element || typeof element !== 'object') return undefined;
    if (element.type === 'button' && element.props['aria-label'] === label) return element;
    return [element.props?.children].flat().map((child) => findButton(child, label)).find(Boolean);
  };
  const button = (label) => findButton(Basics({
    fields: { ...emptyFields, rating }, categoryList, showErrors: false,
    changeField: (key, value) => { assert.equal(key, 'rating'); rating = value; },
  }), label);
  const minus = '평점 0.1점 낮추기';
  const plus = '평점 0.1점 높이기';
  assert.equal(button(minus).props.disabled, true);
  button(minus).props.onClick();
  assert.equal(rating, 0);
  for (let step = 1; step <= 50; step++) {
    button(plus).props.onClick();
    assert.equal(rating, step / 10);
  }
  assert.equal(button(plus).props.disabled, true);
  button(plus).props.onClick();
  assert.equal(rating, 5);
  for (let step = 49; step >= 0; step--) {
    button(minus).props.onClick();
    assert.equal(rating, step / 10);
  }
  assert.equal(button(minus).props.disabled, true);
});

test('recommendation text displays its character count and limits input to 500 characters', () => {
  const props = { fields: { ...emptyFields, verdict: '가'.repeat(30) }, categoryList,
    editor: null, readingImage: false, isSubmitting: false,
    changeField: () => {}, handleImage: () => {}, submitReview: () => {} };
  const markup = renderToStaticMarkup(Form(props));
  assert.match(markup, /<textarea[^>]*maxLength="500"/i);
  assert.match(markup, /30\/500/);
  assert.match(markup, /aria-describedby="review-verdict-count"/);
});
