'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReviewType } from '../_types/review';
import type { ReviewSearchParams } from './use-review-search-params';

export const REVIEWS_API_URL: string = '/reviews';

export type ReviewsPage = {
  content: ReviewType[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type ReviewsParams = Pick<ReviewSearchParams, 'page' | 'size'> &
  Partial<Omit<ReviewSearchParams, 'page' | 'size'>>;

export const useReviews = ({
  page,
  size,
  categoryId,
  query,
  sort = 'latest',
}: ReviewsParams) => {
  const params = { page, size, categoryId, query, sort };
  return useSuspenseQuery({
    queryKey: ['reviews', params],
    queryFn: async (): Promise<ReviewsPage> => {
      if (!REVIEWS_API_URL.trim()) {
        throw new Error('리뷰 API 주소가 설정되지 않았습니다.');
      }
      const { data } = await api.get<ReviewsPage>(REVIEWS_API_URL, { params });
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
};
