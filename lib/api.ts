import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  type AxiosInstance,
} from 'axios';

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

/**
 * Todo 1
 * 인터셉서 이용 액세스 토큰 자동 첨부
 */

/**
 * Todo 2
 * 공통 예외처리
 */
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

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    return Promise.reject(toApiError(error));
  },
);
