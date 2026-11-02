'use client';

import { useEffect, useRef } from 'react';
import { useReviewSearchParams } from '../hooks/use-review-search-params';
import ReviewCard from './review-card';
import CategoryLabel from './category-label';
import ReviewEmptyState from './review-empty-state';
import ReviewPagination from './list/review-pagination';
import ReviewsQueryBoundary from './reviews-query-boundary';
import ReviewListSkeleton from './list/review-list-skeleton';
import { ReviewSearchParams } from '../../../_types/review';
import { useCategories, useReviews } from '../hooks/use-review';

type ReviewSearchResultsProps = {
  params: ReviewSearchParams;
  onPageChange: (page: number) => void;
  onReset: () => void;
  onPageCorrection: (page: number) => void;
};

const ReviewSearchFeed = () => {
  const { params, updateParams } = useReviewSearchParams();
  const { page, size, categoryId, query, searchType = 'title', sort } = params;
  const searchForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // 브라우저의 방문 기록 입력값 복원이 끝난 뒤 URL의 기본값을 적용합니다.
    const restoreSearch = () => {
      window.setTimeout(() => searchForm.current?.reset(), 0);
    };
    searchForm.current?.reset();
    window.addEventListener('popstate', restoreSearch);
    window.addEventListener('pageshow', restoreSearch);
    return () => {
      window.removeEventListener('popstate', restoreSearch);
      window.removeEventListener('pageshow', restoreSearch);
    };
  }, [query, searchType]);

  const { data: categories = [] } = useCategories();

  const resetFilters = () => {
    const input =
      searchForm.current?.querySelector<HTMLInputElement>('[name="query"]');
    const select = searchForm.current?.querySelector<HTMLSelectElement>(
      '[name="searchType"]',
    );
    if (input) input.value = '';
    if (select) select.value = 'title';
    updateParams({
      query: undefined,
      searchType: 'title',
      categoryId: undefined,
      page: 1,
    });
  };

  return (
    <section
      id='reviews'
      aria-labelledby='reviews-list-title'
      className='min-w-0 scroll-mt-6'
    >
      <form
        ref={searchForm}
        autoComplete='off'
        role='search'
        className='flex w-full items-center gap-2'
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = form.get('query');
          updateParams({
            query: typeof value === 'string' ? value : undefined,
            searchType:
              form.get('searchType') === 'author' ? 'author' : 'title',
          });
        }}
      >
        <label className='shrink-0'>
          <span className='sr-only'>검색 대상</span>
          <select
            key={searchType}
            name='searchType'
            defaultValue={searchType}
            className='cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-600 outline-none transition focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100'
          >
            <option value='title'>제목</option>
            <option value='author'>작성자</option>
          </select>
        </label>
        <label className='relative block min-w-0 flex-1'>
          <span className='sr-only'>리뷰 검색</span>
          <span
            aria-hidden='true'
            className='absolute h-full px-2 flex items-center justify-center text-stone-400'
          >
            ⌕
          </span>
          <input
            type='search'
            key={query ?? ''}
            name='query'
            defaultValue={query ?? ''}
            placeholder='검색어를 입력하세요'
            className='w-full rounded-xl border border-stone-200 bg-white py-2.5 px-7 text-xs outline-none transition focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100'
          />
        </label>
        <button
          type='submit'
          className='shrink-0 cursor-pointer rounded-xl bg-[#23745b] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#185b46]'
        >
          검색
        </button>
        <button
          type='button'
          onClick={resetFilters}
          aria-label='필터 초기화'
          title='필터 초기화'
          className='shrink-0 cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2 text-base leading-5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#23745b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
        >
          <span aria-hidden='true'>↻</span>
        </button>
      </form>

      <div className='mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5'>
        <div aria-label='카테고리 필터' className='flex flex-wrap gap-2'>
          <button
            type='button'
            aria-pressed={categoryId === undefined}
            onClick={() => updateParams({ categoryId: undefined })}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${categoryId === undefined ? 'bg-[#263d31] text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100'}`}
          >
            <CategoryLabel category='전체' />
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type='button'
              aria-pressed={categoryId === item.id}
              onClick={() => updateParams({ categoryId: item.id })}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${categoryId === item.id ? 'bg-[#263d31] text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100'}`}
            >
              <CategoryLabel category={item.category} />
            </button>
          ))}
        </div>
      </div>
      <ReviewsQueryBoundary
        skeletonCount={size}
        resetKeys={[page, size, categoryId, query, searchType, sort]}
      >
        <ReviewSearchResults
          params={params}
          onPageChange={(nextPage) => updateParams({ page: nextPage })}
          onReset={resetFilters}
          onPageCorrection={(page) => updateParams({ page }, { replace: true })}
        />
      </ReviewsQueryBoundary>
    </section>
  );
};

export default ReviewSearchFeed;

const ReviewSearchResults = ({
  params,
  onPageChange,
  onReset,
  onPageCorrection,
}: ReviewSearchResultsProps) => {
  const { data } = useReviews(params);
  const lastPage = Math.max(1, data.totalPages);
  const needsCorrection = params.page > lastPage;
  const hasFilters = params.categoryId !== undefined || Boolean(params.query);

  useEffect(() => {
    if (needsCorrection) onPageCorrection(lastPage);
  }, [needsCorrection, lastPage, onPageCorrection]);

  if (needsCorrection) return <ReviewListSkeleton count={10} />;

  return (
    <>
      <div aria-live='polite' aria-atomic='true'>
        <p className='sr-only'>
          검색 결과 {data.totalElements}개,{' '}
          {data.totalPages === 0 ? 0 : params.page} / {data.totalPages} 페이지
        </p>
        <div className='divide-y divide-stone-200/70'>
          {data.content.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {data.content.length === 0 && (
            <ReviewEmptyState
              variant='search'
              hasFilters={hasFilters}
              onReset={onReset}
            />
          )}
        </div>
      </div>
      {data.totalPages > 0 && (
        <ReviewPagination
          page={params.page}
          pageCount={data.totalPages}
          onPageChange={(page) => {
            if (page >= 1 && page <= data.totalPages) onPageChange(page);
          }}
        />
      )}
      <p className='mt-4 text-center text-[10px] text-stone-400'>
        전체 {data.totalElements}개의 이야기 · 페이지당 {data.size}개
      </p>
    </>
  );
};
