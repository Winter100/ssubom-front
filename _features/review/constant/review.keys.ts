import { ReviewsParams } from '@/_types/review';

export const adminReviewKey = ['adminReviews'] as const;
export const reportTypeKey = ['reviewReportTypes'] as const;

export const reviewKeys = {
  all: ['reviews'] as const,
  paginations: () => [...reviewKeys.all, 'paginations'],
  pagination: (params: ReviewsParams) => [...reviewKeys.paginations(), params],
  details: () => [...reviewKeys.all, 'details'],
  detail: (reviewId: string) => [...reviewKeys.details(), reviewId],
  categories: () => [...reviewKeys.all, 'categories'],
  memberReviews: () => [...reviewKeys.all, 'memberReviews'],
  memberReviewCounts: () => [...reviewKeys.all, 'memberReviewCounts'],
  memberReview: (reviewId: string) => [
    ...reviewKeys.all,
    'memberReviews',
    reviewId,
  ],
};
