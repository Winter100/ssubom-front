import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  type AxiosInstance,
} from 'axios';
import {
  getAccessToken,
  getTokenRevision,
  setAccessToken,
} from '@/_features/auth/stores/tokenStore';
import { authApiPaths } from '@/_constant/auth-api-paths';
import { apiPath } from '@/_constant/api-path';
import type { TokenResponse } from '@/_types/auth';

type FieldError = { field: string; message: string };
type ErrorBody = { message: string; errors?: FieldError[] };
type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public errors?: FieldError[],
  ) {
    super(message);
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10_000,
});

const requiresAuth = (config: InternalAxiosRequestConfig): boolean => {
  const requestPath = (config.url ?? '').split(/[?#]/)[0].replace(/^\//, '');
  const requestMethod = (config.method ?? 'get').toUpperCase();
  return authApiPaths.some(
    ({ method, path, withId, suffix = '', withCommentId }) => {
      if (method !== requestMethod) return false;
      const routePath = path.replace(/^\//, '');
      if (!withId) return routePath === requestPath;
      const prefix = `${routePath}/`;
      const id = requestPath.slice(prefix.length).split('/')[0];
      const commentSuffix = withCommentId
        ? requestPath.slice(`${prefix}${id}${suffix}`.length)
        : '';
      return (
        /^[1-9]\d*$/.test(id) &&
        (!withCommentId || /^\/[1-9]\d*$/.test(commentSuffix)) &&
        requestPath === `${prefix}${id}${suffix}${commentSuffix}`
      );
    },
  );
};

api.interceptors.request.use((config) => {
  if (!requiresAuth(config)) return config;

  const accessToken = getAccessToken();

  if (accessToken && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

let refreshing: Promise<string> | null = null;
let authExpiredHandler: (() => void) | undefined;

export const onAuthExpired = (handler: () => void): (() => void) => {
  authExpiredHandler = handler;
  return () => {
    if (authExpiredHandler === handler) authExpiredHandler = undefined;
  };
};

const expireSession = (): void => {
  setAccessToken(null);
  try {
    localStorage.removeItem('hasSession');
  } catch {
    // 저장소에 접근할 수 없어도 메모리와 화면의 인증 상태는 정리합니다.
  }
  authExpiredHandler?.();
};

export const refreshAccessToken = (): Promise<string> => {
  if (refreshing) return refreshing;

  const previousRevision = getTokenRevision();
  refreshing = Promise.resolve().then(async () => {
    try {
      // api의 응답 인터셉터를 거치지 않아 재발급 실패가 재발급을 반복하지 않습니다.
      const { data } = await axios.post<TokenResponse>(
        apiPath.refresh,
        undefined,
        {
          baseURL: api.defaults.baseURL,
          timeout: api.defaults.timeout,
          withCredentials: true,
        },
      );
      if (typeof data.accessToken !== 'string' || !data.accessToken.trim()) {
        throw new Error('토큰 재발급 응답이 올바르지 않습니다.');
      }
      if (getTokenRevision() !== previousRevision) {
        const currentToken = getAccessToken();
        if (!currentToken) throw new Error('인증 상태가 변경되었습니다.');
        return currentToken;
      }
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (error: unknown) {
      if (getTokenRevision() === previousRevision) {
        expireSession();
        try {
          // 재발급 인터셉터를 거치지 않고 서버의 리프레시 쿠키도 정리합니다.
          await axios.post(apiPath.logout, undefined, {
            baseURL: api.defaults.baseURL,
            timeout: api.defaults.timeout,
            withCredentials: true,
          });
        } catch {
          // 서버 로그아웃 실패와 관계없이 로컬 세션은 만료된 상태로 유지합니다.
        }
      }
      throw error;
    } finally {
      refreshing = null;
    }
  });

  return refreshing;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && original && !original.signal?.aborted && requiresAuth(original)) {
      const sentAuthorization = original.headers.get('Authorization');
      const currentToken = getAccessToken();
      if (original._retry) {
        if (currentToken && sentAuthorization === `Bearer ${currentToken}`) {
          expireSession();
        }
      } else {
        original._retry = true;
        try {
          // 늦게 도착한 이전 토큰의 401은 이미 갱신된 토큰으로 재시도합니다.
          const token =
            currentToken && sentAuthorization !== `Bearer ${currentToken}`
              ? currentToken
              : await refreshAccessToken();
          original.headers.set('Authorization', `Bearer ${token}`);
          return api.request(original);
        } catch (refreshError: unknown) {
          return Promise.reject(toApiError(refreshError));
        }
      }
    }

    return Promise.reject(toApiError(error));
  },
);

// 공통 에러 처리
export const toApiError = (error: unknown): ApiError => {
  // axios로 인한 에러인가
  if (axios.isAxiosError<ErrorBody>(error)) {
    // 정상적으로 서버에서 예외처리를 한 상황
    if (error.response) {
      const { status, data } = error.response;
      const newMessage = data.message ?? '요청에 실패했습니다.';
      return new ApiError(newMessage, status, data.errors);
    }

    // HTTP 응답을 확보하지 못한 경우
    return new ApiError('네트워크 오류가 발생했습니다.', null);
  }
  return new ApiError('알 수 없는 오류가 발생했습니다.', null);
};
