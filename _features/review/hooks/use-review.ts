import { useWithdrawal } from '@/_features/my/hooks/use-withdrawal';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { createReview, updateReview } from '../lib/review-submission';
import {
  CategoryType,
  CreateReviewInput,
  ReviewDetail,
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
import {
  ReviewCreateRequest,
  type UpdateReviewInput,
} from '../lib/review-types';
import { getTokenRevision } from '@/_features/auth/stores/tokenStore';

export const reviewApi = {
  create: async (review: ReviewCreateRequest) => {
    await api.post('reviews', review);
  },
  update: async (reviewId: string, review: ReviewCreateRequest) => {
    if (!isValidReviewId(reviewId))
      throw new Error('올바른 리뷰 ID가 아닙니다.');
    await api.put(`${apiPath.reviews}/${reviewId}`, review);
  },
  getPagination: async (params: ReviewsParams) => {
    const response = await api.get<ReviewsPage>(`${apiPath.reviews}`, {
      params,
    });
    return response.data;
  },
  getDetail: async (reviewId: string, signal?: AbortSignal) => {
    if (!isValidReviewId(reviewId)) {
      throw new Error('올바른 리뷰 ID가 아닙니다.');
    }
    const response = await api.get<ReviewDetail>(
      `${apiPath.reviews}/${reviewId}`,
      { signal },
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
  insertLike: async (reviewId: string): Promise<void> => {
    await api.put(`${apiPath.reviews}/${reviewId}/like`);
  },
  deleteLike: async (reviewId: string): Promise<void> => {
    await api.delete(`${apiPath.reviews}/${reviewId}/like`);
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
    queryFn: ({ signal }) => reviewApi.getDetail(reviewId, signal),
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
  const withdrawal = useWithdrawal();
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreateReviewInput>({
    mutationFn: async ({ review, files }) => {
      await withdrawal.assertAllowed();
      return createReview(review, files);
    },
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

// 리뷰 도움됐어요 커스텀 훅
const useReviewLike = (reviewId: string, isLike: boolean) => {
  const withdrawal = useWithdrawal();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...reviewKeys.all, 'like', reviewId],
    mutationFn: () =>
      isLike ? reviewApi.insertLike(reviewId) : reviewApi.deleteLike(reviewId),
    onMutate: async () => {
      await withdrawal.assertAllowed();
      const tokenRevision = getTokenRevision();
      await queryClient.cancelQueries({ queryKey: reviewKeys.all });
      if (tokenRevision !== getTokenRevision()) return;
      const details = queryClient.getQueriesData<ReviewType>({
        queryKey: reviewKeys.details(),
      });
      const pages = queryClient.getQueriesData<ReviewsPage>({
        predicate: ({ queryKey }) =>
          queryKey[0] === reviewKeys.all[0] &&
          (queryKey[1] === 'paginations' ||
            (queryKey[1] === 'memberReviews' &&
              typeof queryKey[2] === 'object')),
      });
      for (const [key, review] of details) {
        if (review && String(review.id) === reviewId)
          queryClient.setQueryData(key, {
            ...review,
            isLike,
            likeCount:
              review.likeCount + Number(isLike) - Number(review.isLike),
          });
      }
      for (const [key, page] of pages) {
        if (page)
          queryClient.setQueryData(key, {
            ...page,
            content: page.content.map((review) =>
              String(review.id) === reviewId
                ? {
                    ...review,
                    isLike,
                    likeCount:
                      review.likeCount + Number(isLike) - Number(review.isLike),
                  }
                : review,
            ),
          });
      }
      return { details, pages, tokenRevision };
    },
    onError: (error: Error, _variables, context) => {
      // 로그아웃 이후 이전 요청의 실패가 로그인 상태의 캐시를 복구하지 않도록 합니다.
      if (!context || context.tokenRevision !== getTokenRevision()) return;
      for (const [key, previous] of context?.details ?? []) {
        if (previous && String(previous.id) === reviewId)
          queryClient.setQueryData<ReviewType>(key, (current) =>
            current
              ? {
                  ...current,
                  isLike: previous.isLike,
                  likeCount: previous.likeCount,
                }
              : current,
          );
      }
      for (const [key, previous] of context?.pages ?? []) {
        const previousReview = previous?.content.find(
          (review) => String(review.id) === reviewId,
        );
        if (previousReview)
          queryClient.setQueryData<ReviewsPage>(key, (current) =>
            current
              ? {
                  ...current,
                  content: current.content.map((review) =>
                    String(review.id) === reviewId
                      ? {
                          ...review,
                          isLike: previousReview.isLike,
                          likeCount: previousReview.likeCount,
                        }
                      : review,
                  ),
                }
              : current,
          );
      }
      notifyError(
        getAuthErrorMessage(error, '도움됐어요 변경에 실패했습니다.'),
      );
    },
    onSettled: () => {
      // 상세 GET은 조회수를 올리므로 즉시 재요청하지 않습니다.
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.all,
        refetchType: 'none',
      });
    },
    retry: false,
  });
};

export const useInsertLike = (reviewId: string) =>
  useReviewLike(reviewId, true);
export const useDeleteLike = (reviewId: string) =>
  useReviewLike(reviewId, false);

export const useUpdateReview = () => {
  const withdrawal = useWithdrawal();
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateReviewInput>({
    mutationFn: async ({ reviewId, review, files, existingImages }) => {
      await withdrawal.assertAllowed();
      return updateReview(reviewId, review, files, existingImages);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
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
