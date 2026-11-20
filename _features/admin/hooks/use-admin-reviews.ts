import { useRef, useState, type SubmitEvent, type SyntheticEvent } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/_features/auth/constant/auth.keys';
import { getReportSessionSignal } from '@/_features/auth/lib/session';
import { useWithdrawalForMember } from '@/_features/my/hooks/use-withdrawal';
import { reviewKeys } from '@/_features/review/constant/review.keys';
import { reviewApi } from '@/_features/review/hooks/use-review';
import { ApiError } from '@/_lib/api/api';
import type { User } from '@/_types/auth';
import { adminReportsKey, adminReviewApi, adminReviewsKey, type AdminReviewFilters } from '../admin-review-api';
import { getAdminErrorMessage } from '../admin-list-utils';

type ReviewToDelete = { id: number; title: string };

export const useAdminReviews = (memberId: number) => {
  const client = useQueryClient();
  const withdrawal = useWithdrawalForMember(memberId);
  const dialog = useRef<HTMLDialogElement>(null);
  const deleting = useRef(false);
  const [target, setTarget] = useState<ReviewToDelete>();
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminReviewFilters>();
  const [searchError, setSearchError] = useState('');
  const reviews = useQuery({
    queryKey: [...adminReviewsKey(memberId), page, filters],
    queryFn: filters ? ({ signal }) => adminReviewApi.getReviews(page, filters, signal) : skipToken,
    placeholderData: (previous, query) => query?.queryKey[4] === filters ? previous : undefined,
    retry: false,
  });
  const categories = useQuery({
    queryKey: reviewKeys.categories(),
    queryFn: reviewApi.getCategoryList,
  });
  const canManage = () => {
    const current = client.getQueryData<User | null>(authKeys.me());
    return current?.id === memberId && current.role === 'ADMIN';
  };
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const signal = getReportSessionSignal();
      await withdrawal.assertAllowed();
      if (!canManage()) throw new Error('관리자 권한이 필요합니다.');
      await adminReviewApi.deleteReview(id, signal);
    },
    retry: false,
  });

  const confirmDelete = async () => {
    if (!target || deleting.current || withdrawal.blocked) return;
    deleting.current = true;
    setError('');
    try {
      await remove.mutateAsync(target.id);
      dialog.current?.close();
      void client.invalidateQueries({ queryKey: reviewKeys.all });
      if (!canManage()) return;
      void client.invalidateQueries({ queryKey: adminReportsKey(memberId) });
      await client.invalidateQueries({ queryKey: adminReviewsKey(memberId) });
      const updated = client.getQueryData<typeof reviews.data>([
        ...adminReviewsKey(memberId), page, filters,
      ]);
      if (updated) setPage(Math.min(page, Math.max(1, updated.totalPages)));
    } catch (cause: unknown) {
      setError(getAdminErrorMessage(cause, '리뷰 삭제에 실패했습니다.'));
      if (cause instanceof ApiError && cause.status === 404) void reviews.refetch();
    } finally {
      deleting.current = false;
    }
  };

  const search = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get('query') ?? '').trim();
    if (!query) {
      setSearchError('검색어를 입력해 주세요.');
      return;
    }
    setSearchError('');
    const categoryId = Number(form.get('categoryId'));
    setFilters({
      categoryId: categoryId || undefined,
      searchType: form.get('searchType') === 'author' ? 'author' : 'title',
      query,
    });
    setPage(1);
  };

  const askToDelete = (review: ReviewToDelete) => {
    setTarget(review);
    setError('');
    dialog.current?.showModal();
  };

  const preventDeleteDismiss = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (deleting.current) event.preventDefault();
  };

  const cancelDelete = () => {
    if (!deleting.current) dialog.current?.close();
  };

  return {
    reviews,
    categories,
    hasSearch: Boolean(filters),
    page,
    setPage,
    search,
    searchError,
    setSearchError,
    isWithdrawalScheduled: Boolean(withdrawal.data?.scheduledAt),
    isDeletionBlocked: withdrawal.blocked,
    isDeleting: remove.isPending,
    target,
    dialog,
    error,
    askToDelete,
    confirmDelete,
    preventDeleteDismiss,
    cancelDelete,
  };
};
