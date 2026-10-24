'use client';

import { Suspense, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import ReviewListSkeleton from './review-list-skeleton';

type ReviewsQueryBoundaryProps = {
  children: ReactNode;
  skeletonCount: number;
  resetKeys?: unknown[];
};

const ReviewsQueryBoundary = ({
  children,
  skeletonCount,
  resetKeys,
}: ReviewsQueryBoundaryProps) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        resetKeys={resetKeys}
        fallbackRender={({ resetErrorBoundary }) => (
          <div role='alert' className='py-20 text-center'>
            <p className='text-sm text-stone-500'>리뷰를 불러오지 못했습니다.</p>
            <button
              type='button'
              onClick={resetErrorBoundary}
              className='mt-4 cursor-pointer text-sm font-semibold text-[#23745b] underline underline-offset-4'
            >
              다시 시도
            </button>
          </div>
        )}
      >
        <Suspense fallback={<ReviewListSkeleton count={skeletonCount} />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);

export default ReviewsQueryBoundary;
