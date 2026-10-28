import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { createReview } from '../lib/review-submission';
import { CreateReviewInput, ReviewsParams } from '@/_types/review';
import { reviewKeys } from '../constant/review.keys';
import { ApiError } from '@/_lib/api/api';
import { getDetailReview, getPaginationReview } from '@/_lib/api/get-api';
import { notifyError } from '@/_lib/notifications';
import { getAuthErrorMessage } from '@/_lib/auth-client';

export const useReviews = ({
  page,
  size,
  categoryId,
  query,
  sort = 'latest',
}: ReviewsParams) => {
  const params = { page, size, categoryId, query, sort };
  return useSuspenseQuery({
    queryKey: reviewKeys.pagination(params),
    queryFn: () => getPaginationReview(params),
  });
};

// 리뷰 상세 조회 커스텀 훅
export const useDetailReview = (reviewId: string) => {
  return useSuspenseQuery({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => getDetailReview(reviewId),
  });
};

// 리뷰 생성 커스텀 훅
export const useCreateReview = () => {
  return useMutation<void, Error, CreateReviewInput>({
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
};
