import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { createReview, updateReview } from '../lib/review-submission';
import {
  CategoryType,
  CreateReviewInput,
  ReviewsPage,
  ReviewsParams,
  ReviewType,
} from '@/_types/review';
import { reviewKeys } from '../constant/review.keys';
import { api, ApiError } from '@/_lib/api/api';
import { notifyError } from '@/_lib/notifications';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import { apiPath } from '@/_constant/api-path';
import { isValidReviewId } from '../lib/review-id';
import { ReviewCreateRequest, type UpdateReviewInput } from '../lib/review-types';

export const reviewApi = {
  create: async (review: ReviewCreateRequest) => {
    await api.post('reviews', review);
  },
  update: async (reviewId: string, review: ReviewCreateRequest) => {
    if (!isValidReviewId(reviewId)) throw new Error('올바른 리뷰 ID가 아닙니다.');
    await api.put(`${apiPath.reviews}/${reviewId}`, review);
  },
  getPagination: async (params: ReviewsParams) => {
    const response = await api.get<ReviewsPage>(`${apiPath.reviews}`, {
      params,
    });
    return response.data;
  },
  getDetail: async (reviewId: string) => {
    if (!isValidReviewId(reviewId)) {
      throw new Error('올바른 리뷰 ID가 아닙니다.');
    }
    const response = await api.get<ReviewType>(
      `${apiPath.reviews}/${reviewId}`,
    );
    return response.data;
  },
  getMyDetail: async (reviewId: string) => {
    if (!isValidReviewId(reviewId)) {
      throw new Error('올바른 리뷰 ID가 아닙니다.');
    }
    const response = await api.get<ReviewType>(
      `${apiPath.reviews}/${reviewId}/edit`,
    );
    return response.data;
  },
  getCategoryList: async () => {
    const response = await api.get<CategoryType[]>(apiPath.categories);
    return response.data;
  },
};

export const useReviews = ({
  page,
  size,
  categoryId,
  query,
  searchType = 'title',
  sort = 'latest',
}: ReviewsParams) => {
  const params = { page, size, categoryId, query, searchType, sort };
  return useSuspenseQuery({
    queryKey: reviewKeys.pagination(params),
    queryFn: () => reviewApi.getPagination(params),
  });
};

// 리뷰 상세 조회
export const useDetailReview = (reviewId: string) => {
  return useSuspenseQuery({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => reviewApi.getDetail(reviewId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

// 리뷰 수정시 필요한 데이터 조회
export const useDetailMyReview = (reviewId: string) => {
  return useSuspenseQuery({
    queryKey: reviewKeys.memberReview(reviewId),
    queryFn: () => reviewApi.getMyDetail(reviewId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
};

// 리뷰 생성 커스텀 훅
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreateReviewInput>({
    mutationFn: ({ review, files }) => createReview(review, files),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reviewKeys.paginations() }),
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

export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateReviewInput>({
    mutationFn: ({ reviewId, review, files, existingImages }) =>
      updateReview(reviewId, review, files, existingImages),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
    retry: false,
    gcTime: 0,
  });
};

export const useCategories = () => {
  return useSuspenseQuery({
    queryKey: reviewKeys.categories(),
    queryFn: () => reviewApi.getCategoryList(),
  });
};
