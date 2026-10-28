import { apiPath } from '@/_constant/api-path';
import { api } from './api';
import { ReviewsPage, ReviewsParams, ReviewType } from '@/_types/review';
import { isValidReviewId } from '@/_features/review/lib/review-id';

/**
 * Todo
 * get 관련 api 옮기기
 */

export const getPaginationReview = async (params: ReviewsParams) => {
  const response = await api.get<ReviewsPage>(`${apiPath.reviews}`, { params });
  return response.data;
};

// 리뷰 상세 조회 API
export const getDetailReview = async (reviewId: string) => {
  if (!isValidReviewId(reviewId)) {
    throw new Error('올바른 리뷰 ID가 아닙니다.');
  }
  const response = await api.get<ReviewType>(`${apiPath.reviews}/${reviewId}`);
  return response.data;
};
