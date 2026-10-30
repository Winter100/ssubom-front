import { ReviewsParams } from '@/_types/review';

export const reviewKeys = {
  all: ['reviews'] as const,
  paginations: () => [...reviewKeys.all, 'paginations'],
  pagination: (params: ReviewsParams) => [...reviewKeys.paginations(), params],
  details: () => [...reviewKeys.all, 'details'],
  detail: (reviewId: string) => [...reviewKeys.details(), reviewId],
  categories: () => [...reviewKeys.all, 'categories'],
  memberReviews: () => [...reviewKeys.all, 'memberReviews'],
};
