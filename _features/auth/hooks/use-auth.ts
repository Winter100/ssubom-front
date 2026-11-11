import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LoginInput,
  LoginResponse,
  SignupInput,
  User,
} from '@/_types/auth';
import { authKeys } from '../constant/auth.keys';
import { api, ApiError } from '@/_lib/api/api';
import { getAccessToken, setAccessToken } from '../stores/tokenStore';
import { clearSession } from '../lib/session';
import { apiPath } from '@/_constant/api-path';
import { getReviewImageUrl } from '@/_features/review/lib/review-image';

// 로그인
export const login = async (input: LoginInput): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(apiPath.login, input, {
    withCredentials: true,
  });
  return {
    ...response.data,
    user: {
      ...response.data.user,
      profileImage: getReviewImageUrl(response.data.user.profileImage),
    },
  };
};

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

// 로그아웃
const logout = async (): Promise<void> => {
  await api.post(apiPath.logout, undefined, { withCredentials: true });
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

// 회원가입
const signup = async (input: SignupInput): Promise<void> => {
  await api.post(apiPath.signup, input);
};

export const useSignup = () => {
  return useMutation({
    mutationFn: (input: SignupInput) => signup(input),
    retry: false,
    gcTime: 0,
  });
};

// 내 정보
const getMe = async (signal?: AbortSignal): Promise<User> => {
  const response = await api.get<User>(apiPath.me, { signal });
  return {
    ...response.data,
    profileImage: getReviewImageUrl(response.data.profileImage),
  };
};

export const useMe = () => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }): Promise<User | null> => {
      if (!getAccessToken() && localStorage.getItem('hasSession') !== '1')
        return null;
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
