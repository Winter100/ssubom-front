'use client';

import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import MyReviewResults from './my-review-results';
import ReviewGridSkeleton from '@/_features/review/components/list/review-grid-skeleton';

type MyReviewsFeedProps = {
  page: number;
  categoryId?: number;
  onPageChange: (page: number) => void;
  onReset: () => void;
};

const MyReviewsFeed = ({
  page,
  categoryId,
  onPageChange,
  onReset,
}: MyReviewsFeedProps) => {
  const pageSize = 30;

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
      <ReviewsQueryBoundary
        fallback={<ReviewGridSkeleton count={pageSize} />}
        resetKeys={[page, categoryId]}
      >
        <MyReviewResults
          params={{ page, categoryId, size: pageSize }}
          onPageChange={onPageChange}
          onPageCorrection={onPageChange}
          onReset={onReset}
        />
      </ReviewsQueryBoundary>
    </section>
  );
};

export default MyReviewsFeed;
