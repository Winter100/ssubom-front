'use client';

import ReviewCard from '@/_features/review/components/review-card';
import { useReviews } from '@/_features/review/hooks/use-review';

const ReviewFeedList = () => {
  const { data } = useReviews({ page: 1, size: 5, sort: 'latest' });

  if (data.content.length === 0) {
    return (
      <p className='py-20 text-center text-sm text-stone-500'>
        아직 등록된 리뷰가 없습니다.
      </p>
    );
  }

  return (
    <div className='divide-y divide-stone-200/70'>
      {data.content.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
};

export default ReviewFeedList;
