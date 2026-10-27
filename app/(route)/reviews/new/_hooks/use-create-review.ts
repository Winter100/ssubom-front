'use client';

import { useMutation } from '@tanstack/react-query';
import { getAuthErrorMessage } from '@/app/_lib/auth-client';
import { notifyError } from '@/app/_lib/notifications';
import { createReview } from '../_lib/review-submission';
import type { ReviewData } from '../_lib/review-types';
import { ApiError } from '@/lib/api';

type CreateReviewInput = {
  review: ReviewData;
  files: ReadonlyMap<string, File>;
};

export const useCreateReview = () =>
  useMutation<void, Error, CreateReviewInput>({
    mutationFn: ({ review, files }) => createReview(review, files),
    onError: (error) => {
      if (error instanceof ApiError) {
        console.log(error.errors);
      }
      notifyError(getAuthErrorMessage(error, '리뷰 생성에 실패했습니다.'));
    },
    retry: false,
    gcTime: 0,
  });
