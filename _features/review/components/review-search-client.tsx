'use client';

import dynamic from 'next/dynamic';
import ReviewGridSkeleton from './list/review-grid-skeleton';
import ReviewsQueryBoundary from './reviews-query-boundary';

const ReviewSearchFeed = dynamic(() => import('./review-search-feed'), {
  ssr: false,
  loading: () => <ReviewGridSkeleton count={15} />,
});

const ReviewSearchClient = () => (
  <ReviewsQueryBoundary fallback={<ReviewGridSkeleton count={15} />}>
    <ReviewSearchFeed />
  </ReviewsQueryBoundary>
);

export default ReviewSearchClient;
