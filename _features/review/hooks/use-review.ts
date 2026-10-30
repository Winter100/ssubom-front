import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { createReview } from '../lib/review-submission';
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

// 리뷰 페이지네이션 조회
const getPaginationReview = async (params: ReviewsParams) => {
  const response = await api.get<ReviewsPage>(`${apiPath.reviews}`, { params });
  return response.data;
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
    queryFn: () => getPaginationReview(params),
  });
};

// 리뷰 상세 조회
const getDetailReview = async (reviewId: string) => {
  if (!isValidReviewId(reviewId)) {
    throw new Error('올바른 리뷰 ID가 아닙니다.');
  }
  const response = await api.get<ReviewType>(`${apiPath.reviews}/${reviewId}`);
  return response.data;
};
export const useDetailReview = (reviewId: string) => {
  return useSuspenseQuery({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => getDetailReview(reviewId),
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

const getCategoryList = async () => {
  const response = await api.get<CategoryType[]>(apiPath.categories);
  return response.data;
};

export const useCategories = () => {
  return useSuspenseQuery({
    queryKey: reviewKeys.categories(),
    queryFn: getCategoryList,
  });
};
