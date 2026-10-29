import axios from 'axios';

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
