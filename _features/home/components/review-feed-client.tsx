'use client';

import ReviewListSkeleton from '@/_features/review/components/list/review-list-skeleton';
import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import dynamic from 'next/dynamic';

const ReviewFeedList = dynamic(() => import('./review-feed-list'), {
  ssr: false,
  loading: () => <ReviewListSkeleton count={5} />,
});

const ReviewFeedClient = () => (
  <ReviewsQueryBoundary skeletonCount={5}>
    <ReviewFeedList />
  </ReviewsQueryBoundary>
);

export default ReviewFeedClient;
