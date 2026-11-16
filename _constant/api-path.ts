export const apiPath = {
  withdrawal: 'auth/withdrawal',
  signup: 'auth/signup',
  login: 'auth/login',
  logout: 'auth/logout',
  refresh: 'auth/refresh',
  me: 'member',
  myReviews: 'member/reviews',
  myReviewCounts: 'member/count',
  categories: 'categories',
  reviews: 'reviews',
  presignedImages: 'storage/presigned-url',
} as const;
