import { apiPath } from './api-path';

type AuthApiRoute = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: (typeof apiPath)[keyof typeof apiPath];
  withId?: boolean;
};

export const authApiPaths: readonly AuthApiRoute[] = [
  { method: 'GET', path: apiPath.me },
  { method: 'GET', path: apiPath.myReviews },
  { method: 'POST', path: apiPath.reviews },
  { method: 'DELETE', path: apiPath.reviews, withId: true },
];
