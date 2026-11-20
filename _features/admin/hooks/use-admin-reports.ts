import { useState, type SubmitEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminReportsKey, adminReviewApi } from '../admin-review-api';

export const useAdminReports = (memberId: number, initialReviewId?: number) => {
  const [page, setPage] = useState(1);
  const [reviewId, setReviewId] = useState(initialReviewId);
  const [filter, setFilter] = useState(initialReviewId?.toString() ?? '');
  const [filterError, setFilterError] = useState('');
  const reports = useQuery({
    queryKey: [...adminReportsKey(memberId), page, reviewId],
    queryFn: ({ signal }) => adminReviewApi.getReports(page, reviewId, signal),
    placeholderData: (previous, query) => query?.queryKey[4] === reviewId ? previous : undefined,
    retry: false,
  });

  const applyFilter = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = filter.trim();
    const id = Number(value);
    if (value && (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id))) {
      setFilterError('리뷰 ID는 양의 정수로 입력해 주세요.');
      return;
    }
    setFilterError('');
    setReviewId(value ? id : undefined);
    setPage(1);
  };

  const clearFilter = () => {
    setFilter('');
    setFilterError('');
    setReviewId(undefined);
    setPage(1);
  };

  return {
    reports,
    page,
    setPage,
    hasFilter: reviewId !== undefined,
    filter,
    setFilter,
    filterError,
    applyFilter,
    clearFilter,
  };
};
