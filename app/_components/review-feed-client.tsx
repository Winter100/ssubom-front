'use client';

import dynamic from 'next/dynamic';
import ReviewListSkeleton from './review-list-skeleton';
import ReviewsQueryBoundary from './reviews-query-boundary';

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
