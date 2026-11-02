'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewWriter from '@/_features/review/components/form/review-writer';
import {
  useDetailMyReview,
  useUpdateReview,
} from '@/_features/review/hooks/use-review';
import type { ReviewData } from '@/_features/review/lib/review-types';
import { getReviewImageUrl } from '@/_features/review/lib/review-image';
import {
  getImageSources,
  replaceImageSources,
} from '@/_features/review/lib/local-images';

const ReviewEditContent = ({ id }: { id: string }) => {
  const { data: review } = useDetailMyReview(id);
  const router = useRouter();
  const mutation = useUpdateReview();
  const [{ initialReview, existingImages }] = useState(() => {
    const bodySources = getImageSources(review.content);
    const keys = new Set(
      [review.mainImageKey, ...bodySources].filter(
        (key): key is string => Boolean(key),
      ),
    );
    const existingImages = new Map<string, string>();
    keys.forEach((key) => {
      existingImages.set(key, key);
      const url = getReviewImageUrl(key);
      if (url) existingImages.set(url, key);
    });
    const initialReview: ReviewData = {
      title: review.title,
      product: review.product,
      category: review.category,
      duration: review.duration,
      rating: review.rating,
      image: getReviewImageUrl(review.mainImageKey),
      body: replaceImageSources(
        review.content,
        new Map(bodySources.map((key) => [key, getReviewImageUrl(key)])),
      ),
      pros: review.pros ?? [''],
      cons: review.cons ?? [''],
      verdict: review.verdict ?? '',
    };

    return { initialReview, existingImages };
  });

  const submitReview = async (
    review: ReviewData,
    files: ReadonlyMap<string, File>,
  ): Promise<void> => {
    await mutation.mutateAsync({ reviewId: id, review, files, existingImages });
    router.replace(`/reviews/${id}`);
  };

  return (
    <ReviewWriter
      initialReview={initialReview}
      onSubmit={submitReview}
      submitting={mutation.isPending}
    />
  );
};

export default ReviewEditContent;
