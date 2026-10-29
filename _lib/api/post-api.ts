import { apiPath } from '@/_constant/api-path';
import type { LoginInput, LoginResponse, SignupInput } from '@/_types/auth';
import { api } from './api';

// 로그인은 인증 주소 목록에서 제외하고 refresh 쿠키를 받습니다.
export const login = async (input: LoginInput): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(apiPath.login, input, { withCredentials: true });
  return response.data;
};

// 로그아웃은 인증 주소 목록에서 제외하고 refresh 쿠키를 보냅니다.
export const logout = async (): Promise<void> => {
  await api.post(apiPath.logout, undefined, { withCredentials: true });
};

export const signup = async (input: SignupInput): Promise<void> => {
  await api.post(apiPath.signup, input);
};
