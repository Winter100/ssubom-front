'use client';

import dynamic from 'next/dynamic';
import ReviewListSkeleton from './list/review-list-skeleton';

const ReviewSearchFeed = dynamic(() => import('./review-search-feed'), {
  ssr: false,
  loading: () => <ReviewListSkeleton count={10} />,
});

export default ReviewSearchFeed;
