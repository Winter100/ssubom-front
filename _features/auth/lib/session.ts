import type { QueryClient } from '@tanstack/react-query';
import { authKeys } from '../constant/auth.keys';
import { setAccessToken } from '../stores/tokenStore';

export const clearSession = (queryClient: QueryClient): void => {
  setAccessToken(null);
  localStorage.removeItem('hasSession');
  void queryClient.cancelQueries({ queryKey: authKeys.all });
  // 구독 중인 쿼리는 유지하고 데이터를 비워 헤더와 마이페이지에 즉시 알립니다.
  queryClient.setQueriesData({ queryKey: authKeys.all }, null);
};
