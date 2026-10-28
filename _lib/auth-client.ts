import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  LoginInput,
  LoginResponse,
  SignupInput,
  TokenResponse,
  User,
} from '../_types/auth';

type AuthPaths = {
  login: string;
  signup: string;
  refresh: string;
  currentUser: string;
};

export const getAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError<unknown>(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return '요청 시간이 초과되었습니다. 다시 시도해 주세요.';
    if (!error.response)
      return '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.';
    const body: unknown = error.response.data;
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string' &&
      body.message.trim()
    )
      return body.message;
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const isUnauthorized = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 401;

export const createAuthClient = (
  http: AxiosInstance,
  paths: AuthPaths,
  onExpired: () => void,
) => {
  let accessToken: string | null = null;
  let refreshPromise: Promise<string> | null = null;
  let generation = 0;

  const path = (key: keyof AuthPaths): string => {
    const value = paths[key].trim();
    if (!value)
      throw new Error(
        `인증 API 주소(${key})를 app/_constant/api-path.ts에 설정해 주세요.`,
      );
    return value;
  };

  const clear = (): void => {
    accessToken = null;
    generation++;
    onExpired();
  };

  const refresh = (): Promise<string> => {
    if (refreshPromise) return refreshPromise;
    const currentGeneration = generation;
    refreshPromise = Promise.resolve().then(async () => {
      try {
        const { data } = await http.post<TokenResponse>(
          path('refresh'),
          undefined,
          { withCredentials: true },
        );
        if (!data.accessToken)
          throw new Error('토큰 재발급 응답이 올바르지 않습니다.');
        if (generation === currentGeneration) accessToken = data.accessToken;
        return accessToken ?? data.accessToken;
      } catch (error: unknown) {
        if (generation === currentGeneration && isUnauthorized(error)) clear();
        throw error;
      } finally {
        refreshPromise = null;
      }
    });
    return refreshPromise;
  };

  const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    const token = accessToken ?? (await refresh());
    const send = (value: string) =>
      http.request<T>({
        ...config,
        headers: { ...config.headers, Authorization: `Bearer ${value}` },
      });
    try {
      return (await send(token)).data;
    } catch (error: unknown) {
      if (!isUnauthorized(error)) throw error;
      const renewed =
        accessToken && accessToken !== token ? accessToken : await refresh();
      try {
        return (await send(renewed)).data;
      } catch (retryError: unknown) {
        if (isUnauthorized(retryError) && accessToken === renewed) clear();
        throw retryError;
      }
    }
  };

  return {
    refresh,
    request,
    currentUser: (): Promise<User> =>
      request<User>({ method: 'GET', url: path('currentUser') }),
    login: async (input: LoginInput): Promise<LoginResponse> => {
      const { data } = await http.post<LoginResponse>(path('login'), input, {
        withCredentials: true,
      });
      generation++;
      accessToken = data.accessToken;
      return data;
    },
    signup: async (input: SignupInput): Promise<void> => {
      await http.post(path('signup'), input);
    },
  };
};

export type AuthClient = ReturnType<typeof createAuthClient>;
