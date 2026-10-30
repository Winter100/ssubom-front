'use client';

import dynamic from 'next/dynamic';
import ReviewDetailSkeleton from './review-detail-skeleton';

const ReviewDetailClient = dynamic(() => import('./review-detail-container'), {
  ssr: false,
  loading: () => <ReviewDetailSkeleton />,
});

export default ReviewDetailClient;
