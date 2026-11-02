import { apiPath } from './api-path';

type AuthApiRoute = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: (typeof apiPath)[keyof typeof apiPath];
  withId?: boolean;
  suffix?: string;
};

export const authApiPaths: readonly AuthApiRoute[] = [
  { method: 'GET', path: apiPath.me },
  { method: 'GET', path: apiPath.myReviews },
  { method: 'GET', path: apiPath.reviews, withId: true, suffix: '/edit' },
  { method: 'POST', path: apiPath.reviews },
  { method: 'POST', path: apiPath.presignedImages },
  { method: 'PUT', path: apiPath.reviews, withId: true },
  { method: 'DELETE', path: apiPath.reviews, withId: true },
];
