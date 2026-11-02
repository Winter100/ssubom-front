'use client';

import dynamic from 'next/dynamic';
import ReviewListSkeleton from './list/review-list-skeleton';
import ReviewsQueryBoundary from './reviews-query-boundary';

const ReviewSearchFeed = dynamic(() => import('./review-search-feed'), {
  ssr: false,
  loading: () => <ReviewListSkeleton count={10} />,
});

const ReviewSearchClient = () => (
  <ReviewsQueryBoundary skeletonCount={10}>
    <ReviewSearchFeed />
  </ReviewsQueryBoundary>
);

export default ReviewSearchClient;
