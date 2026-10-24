'use client';

import { useEffect, useRef } from 'react';
import { useReviews } from '../_hooks/use-reviews';
import { useCategories } from '../_hooks/use-categories';
import { useReviewSearchParams } from '../_hooks/use-review-search-params';
import ReviewCard from './review-card';
import ReviewPagination from './review-pagination';
import ReviewsQueryBoundary from './reviews-query-boundary';
import ReviewListSkeleton from './review-list-skeleton';
import type { ReviewSearchParams } from '../_hooks/use-review-search-params';

type ReviewSearchResultsProps = {
  params: ReviewSearchParams;
  onPageChange: (page: number) => void;
  onReset: () => void;
  onPageCorrection: (page: number) => void;
};

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
          검색 결과 {data.totalElements}개, {data.totalPages === 0 ? 0 : params.page} /{' '}
          {data.totalPages} 페이지
        </p>
        <div className='divide-y divide-stone-200/70'>
          {data.content.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {data.content.length === 0 && (
            <div className='py-20 text-center'>
              <p className='text-lg font-semibold'>
                {hasFilters
                  ? '아직 일치하는 리뷰가 없어요.'
                  : '아직 등록된 리뷰가 없습니다.'}
              </p>
              {hasFilters && (
                <>
                  <p className='mt-2 text-sm text-stone-500'>
                    다른 검색어나 카테고리로 찾아보세요.
                  </p>
                  <button
                    type='button'
                    onClick={onReset}
                    className='mt-5 cursor-pointer text-sm font-semibold text-[#23745b] underline underline-offset-4'
                  >
                    검색·카테고리 초기화
                  </button>
                </>
              )}
            </div>
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

const ReviewSearchFeed = () => {
  const { params, updateParams } = useReviewSearchParams();
  const { page, size, categoryId, query, sort } = params;
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
  }, [query]);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

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
          updateParams({ query: typeof value === 'string' ? value : undefined });
        }}
      >
        <label className='relative block min-w-0 flex-1'>
          <span className='sr-only'>리뷰 검색</span>
          <span
            aria-hidden='true'
            className='absolute top-2.5 left-3 text-stone-400'
          >
            ⌕
          </span>
          <input
            type='search'
            key={query ?? ''}
            name='query'
            defaultValue={query ?? ''}
            placeholder='제목, 작성자 검색'
            className='w-full rounded-xl border border-stone-200 bg-white py-2.5 pr-3 pl-9 text-xs outline-none transition focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100'
          />
        </label>
        <button
          type='submit'
          className='shrink-0 cursor-pointer rounded-xl bg-[#23745b] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#185b46]'
        >
          검색
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
            전체
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type='button'
              aria-pressed={categoryId === item.id}
              onClick={() => updateParams({ categoryId: item.id })}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${categoryId === item.id ? 'bg-[#263d31] text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100'}`}
            >
              {item.category}
            </button>
          ))}
        </div>
      </div>

      {categoriesLoading ? (
        <p role='status' className='mt-3 text-xs text-stone-400'>
          카테고리를 불러오는 중입니다.
        </p>
      ) : categoriesError ? (
        <div role='alert' className='mt-3 text-xs text-stone-500'>
          카테고리를 불러오지 못했습니다.
          <button
            type='button'
            onClick={() => void refetchCategories()}
            className='ml-2 cursor-pointer text-[#23745b] underline underline-offset-4'
          >
            카테고리 다시 시도
          </button>
        </div>
      ) : categories.length === 0 ? (
        <p role='status' className='mt-3 text-xs text-stone-400'>
          등록된 카테고리가 없습니다.
        </p>
      ) : null}

      <ReviewsQueryBoundary
        skeletonCount={size}
        resetKeys={[page, size, categoryId, query, sort]}
      >
        <ReviewSearchResults
          params={params}
          onPageChange={(nextPage) => updateParams({ page: nextPage })}
          onReset={() => updateParams({ query: undefined, categoryId: undefined, page: 1 })}
          onPageCorrection={(page) => updateParams({ page }, { replace: true })}
        />
      </ReviewsQueryBoundary>
    </section>
  );
};

export default ReviewSearchFeed;
