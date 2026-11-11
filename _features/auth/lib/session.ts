import type { QueryClient } from '@tanstack/react-query';
import { authKeys } from '../constant/auth.keys';
import { setAccessToken } from '../stores/tokenStore';
import { reviewKeys } from '@/_features/review/constant/review.keys';
import type { ReviewsPage, ReviewType } from '@/_types/review';

export const clearSession = (queryClient: QueryClient): void => {
  setAccessToken(null);
  localStorage.removeItem('hasSession');
  void queryClient.cancelQueries({ queryKey: authKeys.all });
  // 구독 중인 쿼리는 유지하고 데이터를 비워 헤더와 마이페이지에 즉시 알립니다.
  queryClient.setQueriesData({ queryKey: authKeys.all }, null);
  // 이전 로그인 상태의 응답이 좋아요 표시를 되살리지 않도록 조회를 취소합니다.
  void queryClient.cancelQueries({ queryKey: reviewKeys.all });
  queryClient.setQueriesData<ReviewType>(
    { queryKey: reviewKeys.details() },
    (review) => review ? { ...review, isLike: false } : review,
  );
  queryClient.setQueriesData<ReviewsPage>(
    {
      predicate: ({ queryKey }) =>
        queryKey[0] === reviewKeys.all[0] &&
        (queryKey[1] === 'paginations' ||
          (queryKey[1] === 'memberReviews' && typeof queryKey[2] === 'object')),
    },
    (page) => page ? {
      ...page,
      content: page.content.map((review) => ({ ...review, isLike: false })),
    } : page,
  );
};
