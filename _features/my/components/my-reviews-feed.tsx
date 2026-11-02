'use client';

import { useState } from 'react';
import { useCategories } from '@/_features/review/hooks/use-review';
import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import type { ReviewSearchParams } from '@/_types/review';
import MyReviewResults from './my-review-results';
import CategoryLabel from '@/_features/review/components/category-label';

const MyReviewsFeed = () => {
  const [filters, setFilters] = useState<
    Pick<ReviewSearchParams, 'page' | 'categoryId'>
  >({ page: 1 });
  const { data: categories } = useCategories();
  const pageSize = 10;
  const resetFilters = (): void => setFilters({ page: 1 });

  return (
    <section aria-labelledby='my-reviews-title' className='mt-10 sm:mt-12'>
      <div className='flex flex-wrap items-baseline justify-between gap-3 pb-5'>
        <div className='flex items-baseline gap-2'>
          <h2
            id='my-reviews-title'
            className='text-lg font-semibold tracking-tight'
          >
            내가 쓴 리뷰
          </h2>
        </div>
        <p className='text-xs leading-5 text-stone-500'>
          직접 남긴 경험을 한눈에 모아보세요.
        </p>
      </div>
      <div className='mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5'>
        <div
          role='group'
          aria-label='내 리뷰 카테고리 필터'
          className='flex flex-wrap gap-2'
        >
          {[{ id: undefined, category: '전체' }, ...categories].map(
            (category) => (
              <button
                key={category.id ?? 'all'}
                type='button'
                aria-pressed={filters.categoryId === category.id}
                onClick={() =>
                  setFilters({
                    ...filters,
                    categoryId: category.id,
                    page: 1,
                  })
                }
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${filters.categoryId === category.id ? 'bg-[#263d31] text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100'}`}
              >
                <CategoryLabel category={category.category} />
              </button>
            ),
          )}
        </div>
        <button
          type='button'
          onClick={resetFilters}
          className='cursor-pointer rounded-lg px-3 py-2 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#23745b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
        >
          필터 초기화
        </button>
      </div>
      <ReviewsQueryBoundary
        skeletonCount={pageSize}
        resetKeys={[filters.page, filters.categoryId]}
      >
        <MyReviewResults
          params={{ ...filters, size: pageSize }}
          onPageChange={(page) => setFilters({ ...filters, page })}
          onPageCorrection={(page) => setFilters({ ...filters, page })}
          onReset={resetFilters}
        />
      </ReviewsQueryBoundary>
    </section>
  );
};

export default MyReviewsFeed;
