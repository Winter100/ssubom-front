'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type ReviewSearchParams = {
  page: number;
  size: number;
  categoryId?: number;
  query?: string;
  sort: 'latest' | 'rating';
};

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
    next.sort !== current.sort;
  if (filtersChanged) next.page = 1;
  if (!filtersChanged && next.page === current.page) return null;

  const params = new URLSearchParams(search);
  params.set('page', String(next.page));
  params.set('size', String(next.size));
  params.set('sort', next.sort);
  if (next.categoryId === undefined) params.delete('categoryId');
  else params.set('categoryId', String(next.categoryId));
  if (next.query === undefined) params.delete('query');
  else params.set('query', next.query);
  return `${pathname}?${params.toString()}${hash}`;
};

export const useReviewSearchParams = () => {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const params = parseReviewSearchParams(search);

  const updateParams = (updates: Partial<ReviewSearchParams>) => {
    const href = createReviewSearchHref(
      pathname,
      new URLSearchParams(search.toString()),
      updates,
      window.location.hash,
    );
    if (href) router.push(href, { scroll: false });
  };

  return { params, updateParams };
};
