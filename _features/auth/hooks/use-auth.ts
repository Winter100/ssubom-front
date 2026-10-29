import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, LoginResponse, SignupInput, User } from '@/_types/auth';
import { authKeys } from '../constant/auth.keys';
import { getMe } from '@/_lib/api/get-api';
import { login, logout, signup } from '@/_lib/api/post-api';
import { ApiError, refreshAccessToken } from '@/_lib/api/api';
import { getAccessToken, setAccessToken } from '../stores/tokenStore';
import { clearSession } from '../lib/session';

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: async (auth: LoginResponse) => {
      await queryClient.cancelQueries({ queryKey: authKeys.all });
      // 로그인 힌트 플래그
      localStorage.setItem('hasSession', '1');

      // 액세스 토큰 세팅
      setAccessToken(auth.accessToken);

      // 유저 정보 상태 세팅
      queryClient.setQueryData(authKeys.me(), auth.user);
    },
    retry: false,
    gcTime: 0,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearSession(queryClient);
    },
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: (input: SignupInput) => signup(input),
    retry: false,
    gcTime: 0,
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }): Promise<User | null> => {
      if (!getAccessToken() && localStorage.getItem('hasSession') !== '1') return null;
      try {
        return await getMe(signal);
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: refreshAccessToken,
    retry: false,
    gcTime: 0,
  });
};
