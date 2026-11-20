import { apiPath } from './api-path';

type AuthApiRoute = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: (typeof apiPath)[keyof typeof apiPath];
  withId?: boolean;
  suffix?: string;
  withCommentId?: boolean;
};

export const authApiPaths: readonly AuthApiRoute[] = [
  { method: 'GET', path: apiPath.withdrawal },
  { method: 'POST', path: apiPath.withdrawal },
  { method: 'DELETE', path: apiPath.withdrawal },
  { method: 'GET', path: apiPath.me },
  { method: 'POST', path: apiPath.me },
  { method: 'GET', path: apiPath.myReviews },
  { method: 'GET', path: apiPath.myReviewCounts },
  { method: 'GET', path: apiPath.reviews, withId: true, suffix: '/edit' },
  { method: 'PUT', path: apiPath.reviews, withId: true, suffix: '/like' },
  { method: 'DELETE', path: apiPath.reviews, withId: true, suffix: '/like' },
  { method: 'GET', path: apiPath.reviews, withId: true },
  { method: 'GET', path: apiPath.reviews },
  { method: 'POST', path: apiPath.reviews, withId: true, suffix: '/reports' },
  { method: 'GET', path: apiPath.reviewReportTypes },
  { method: 'GET', path: apiPath.adminReviews },
  { method: 'GET', path: apiPath.adminCategories },
  { method: 'POST', path: apiPath.adminCategories },
  { method: 'PATCH', path: apiPath.adminCategories, withId: true },
  { method: 'DELETE', path: apiPath.adminCategories, withId: true },
  { method: 'PUT', path: apiPath.adminCategoryOrder },
  { method: 'DELETE', path: apiPath.adminReviews, withId: true },
  { method: 'GET', path: apiPath.adminReviewReports },
  { method: 'GET', path: apiPath.adminReviewReportTypes },
  { method: 'POST', path: apiPath.adminReviewReportTypes },
  { method: 'PUT', path: apiPath.adminReviewReportTypes, withId: true },
  { method: 'PUT', path: apiPath.adminReviewReportTypeOrder },
  { method: 'POST', path: apiPath.reviews },
  { method: 'POST', path: apiPath.presignedImages },
  { method: 'PUT', path: apiPath.reviews, withId: true },
  { method: 'DELETE', path: apiPath.reviews, withId: true },
  { method: 'POST', path: apiPath.reviews, withId: true, suffix: '/comments' },
  {
    method: 'PUT', path: apiPath.reviews, withId: true,
    suffix: '/comments', withCommentId: true,
  },
  {
    method: 'DELETE', path: apiPath.reviews, withId: true,
    suffix: '/comments', withCommentId: true,
  },
];
