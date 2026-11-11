import { apiPath } from '@/_constant/api-path';
import { reviewKeys } from '@/_features/review/constant/review.keys';
import { api } from '@/_lib/api/api';
import type {
  ReviewCategoryCount,
  ReviewsPage,
  ReviewsParams,
} from '@/_types/review';
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';

export const useMyReviewCounts = () =>
  useQuery({
    queryKey: reviewKeys.memberReviewCounts(),
    queryFn: async ({ signal }): Promise<ReviewCategoryCount[]> => {
      const response = await api.get<ReviewCategoryCount[]>(apiPath.myReviewCounts, {
        signal,
      });
      return response.data;
    },
  });

// 내 리뷰 목록
const getMyReviews = async (
  params: ReviewsParams,
  signal?: AbortSignal,
): Promise<ReviewsPage> => {
  const response = await api.get<ReviewsPage>(apiPath.myReviews, {
    params,
    signal,
  });
  return response.data;
};

export const useMyReviews = ({ page, size, categoryId }: ReviewsParams) => {
  const params = { page, size, categoryId };
  return useSuspenseQuery({
    queryKey: [...reviewKeys.memberReviews(), params],
    queryFn: ({ signal }) => getMyReviews(params, signal),
  });
};

// 리뷰 삭제
const deleteReview = async (reviewId: number, signal?: AbortSignal) => {
  const response = await api.delete<void>(`${apiPath.reviews}/${reviewId}`, {
    signal,
  });
  return response.data;
};
export const useReviewDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      signal,
    }: {
      reviewId: number;
      signal?: AbortSignal;
    }) => deleteReview(reviewId, signal),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
    retry: false,
  });
};
