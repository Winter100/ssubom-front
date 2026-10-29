import { apiPath } from './api-path';

type AuthApiRoute = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: (typeof apiPath)[keyof typeof apiPath];
};

export const authApiPaths: readonly AuthApiRoute[] = [
  { method: 'GET', path: apiPath.me },
  { method: 'POST', path: apiPath.reviews },
];
