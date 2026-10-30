'use client';

import { ReviewSearchParams } from '@/_types/review';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const positiveInteger = (value: string | null): number | undefined => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
};

export const parseReviewSearchParams = (
  params: Pick<URLSearchParams, 'get'>,
): ReviewSearchParams => ({
  page: positiveInteger(params.get('page')) ?? 1,
  size: positiveInteger(params.get('size')) ?? 10,
  categoryId: positiveInteger(params.get('categoryId')),
  query: params.get('query')?.trim() || undefined,
  searchType: params.get('searchType') === 'author' ? 'author' : 'title',
  sort: params.get('sort') === 'rating' ? 'rating' : 'latest',
});

export const createReviewSearchHref = (
  pathname: string,
  search: URLSearchParams,
  updates: Partial<ReviewSearchParams>,
  hash: string,
): string | null => {
  const current = parseReviewSearchParams(search);
  const next = { ...current, ...updates };
  next.query = next.query?.trim() || undefined;
  const filtersChanged =
    next.size !== current.size ||
    next.categoryId !== current.categoryId ||
    next.query !== current.query ||
    next.searchType !== current.searchType ||
    next.sort !== current.sort;
  if (filtersChanged) next.page = 1;
  if (!filtersChanged && next.page === current.page) return null;

  const params = new URLSearchParams(search);
  params.set('page', String(next.page));
  params.set('size', String(next.size));
  params.set('sort', next.sort);
  params.set('searchType', next.searchType ?? 'title');
  if (next.categoryId === undefined) params.delete('categoryId');
  else params.set('categoryId', String(next.categoryId));
  if (next.query === undefined) params.delete('query');
  else params.set('query', next.query);
  return `${pathname}?${params.toString()}${hash}`;
};

type ReviewListUpdates = Partial<
  Pick<ReviewSearchParams, 'page' | 'categoryId' | 'query' | 'searchType'>
>;

export const createReviewListHref = (
  pathname: string,
  search: URLSearchParams,
  updates: ReviewListUpdates,
  hash: string,
): string | null => {
  const normalized = new URLSearchParams(search);
  normalized.delete('size');
  normalized.delete('sort');
  const href = createReviewSearchHref(pathname, normalized, updates, hash);
  if (!href) return null;
  const url = new URL(href, 'http://localhost');
  url.searchParams.delete('size');
  url.searchParams.delete('sort');
  return `${url.pathname}${url.search}${url.hash}`;
};

export const useReviewSearchParams = () => {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const params: ReviewSearchParams = {
    ...parseReviewSearchParams(search),
    size: 10,
    sort: 'latest',
  };

  const updateParams = (
    updates: ReviewListUpdates,
    options: { replace?: boolean } = {},
  ) => {
    const href = createReviewListHref(
      pathname,
      new URLSearchParams(search.toString()),
      updates,
      window.location.hash,
    );
    if (href) {
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    }
  };

  return { params, updateParams };
};
