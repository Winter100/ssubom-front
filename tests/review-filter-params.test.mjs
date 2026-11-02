import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (path, dependencies = {}) => {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => dependencies[name] ?? require(name), compiled, compiled.exports,
  );
  return compiled.exports;
};
const { apiPath } = load('_constant/api-path.ts');
const { reviewKeys } = load('_features/review/constant/review.keys.ts');

for (const member of [false, true]) {
  test(`${member ? 'member' : 'public'} list sends the category filter and isolates its cache`, async () => {
    const requests = [];
    const api = { get: async (url, config) => {
      requests.push({ url, ...config });
      return { data: { content: [], totalElements: 0, totalPages: 0, page: 1, size: 10 } };
    } };
    const dependencies = {
      '@tanstack/react-query': { useSuspenseQuery: (options) => options },
      '@/_constant/api-path': { apiPath },
      '@/_lib/api/api': { api },
      '@/_features/review/constant/review.keys': { reviewKeys },
      '../constant/review.keys': { reviewKeys },
      '../lib/review-submission': {}, '@/_lib/notifications': {}, '@/_lib/auth-client': {},
      '../lib/review-id': {},
    };
    const hooks = load(member ? '_features/my/hooks/use-my.ts' : '_features/review/hooks/use-review.ts', dependencies);
    const hook = member ? hooks.useMyReviews : hooks.useReviews;
    const options = hook({ page: 1, size: 10, categoryId: 2 });
    const result = await options.queryFn({ signal: undefined });
    assert.equal(requests[0].url, member ? apiPath.myReviews : apiPath.reviews);
    assert.equal(requests[0].params.categoryId, 2);
    assert.equal(requests[0].params.page, 1);
    assert.equal(result.totalElements, 0);
    assert.deepEqual(result.content, []);
    assert.notDeepEqual(options.queryKey, hook({ page: 1, size: 10 }).queryKey);
    assert.notDeepEqual(options.queryKey, hook({ page: 2, size: 10, categoryId: 2 }).queryKey);
  });
}
