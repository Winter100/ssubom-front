'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import ReviewListSkeleton from './list/review-list-skeleton';
import { notFound, useRouter } from 'next/navigation';
import { ApiError } from '@/_lib/api/api';

type ReviewsQueryBoundaryProps = {
  children: ReactNode;
  skeletonCount?: number;
  fallback?: ReactNode;
  resetKeys?: unknown[];
  notFoundOn404?: boolean;
  forbiddenRedirectTo?: string;
};

const ForbiddenRedirect = ({ href }: { href: string }) => {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return <p role='status' className='py-20 text-center'>마이페이지로 이동하고 있습니다…</p>;
};

const ReviewsQueryBoundary = ({
  children,
  skeletonCount = 5,
  fallback,
  resetKeys,
  notFoundOn404 = false,
  forbiddenRedirectTo,
}: ReviewsQueryBoundaryProps) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        resetKeys={resetKeys}
        fallbackRender={({ error, resetErrorBoundary }) => {
          if (
            forbiddenRedirectTo &&
            error instanceof ApiError &&
            error.status === 403
          ) {
            return <ForbiddenRedirect href={forbiddenRedirectTo} />;
          }
          if (
            notFoundOn404 &&
            error instanceof ApiError &&
            error.status === 404
          ) {
            notFound();
          }
          return (
            <div role='alert' className='py-20 text-center'>
              <p className='text-sm text-stone-500'>
                리뷰를 불러오지 못했습니다.
              </p>
              <button
                type='button'
                onClick={resetErrorBoundary}
                className='mt-4 cursor-pointer text-sm font-semibold text-[#23745b] underline underline-offset-4'
              >
                다시 시도
              </button>
            </div>
          );
        }}
      >
        <Suspense
          fallback={fallback ?? <ReviewListSkeleton count={skeletonCount} />}
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);

export default ReviewsQueryBoundary;
