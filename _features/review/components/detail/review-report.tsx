'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/_features/auth/constant/auth.keys';
import { useMe } from '@/_features/auth/hooks/use-auth';
import { getLoginHref } from '@/_features/auth/lib/login-redirect';
import { getReportSessionSignal } from '@/_features/auth/lib/session';
import { useWithdrawal, WITHDRAWAL_RESTRICTION } from '@/_features/my/hooks/use-withdrawal';
import { ApiError } from '@/_lib/api/api';
import type { User } from '@/_types/auth';
import type { ReviewDetail } from '@/_types/review';
import { reportTypeKey, reviewKeys } from '../../constant/review.keys';
import { getReportTypes, msUntilSeoulMidnight, submitReport, type ReportInput } from '../../lib/review-report-api';

const ReviewReport = ({ review }: { review: ReviewDetail }) => {
  const { data: user, isPending, isError } = useMe();
  if (isPending || isError || typeof review.isReportedToday !== 'boolean' ||
      typeof review.isReported !== 'boolean') return null;
  if (!user) return <Link className='cursor-pointer underline' href={getLoginHref(`/reviews/${review.id}`)}>신고하기</Link>;
  if (user.id === review.author.id) return null;
  return <ReportAction key={user.id} review={review} memberId={user.id} />;
};

const ReportAction = ({ review, memberId }: { review: ReviewDetail; memberId: number }) => {
  const client = useQueryClient();
  const withdrawal = useWithdrawal();
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [reportTypeId, setReportTypeId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const reviewId = String(review.id);
  const types = useQuery({
    queryKey: [...reportTypeKey, memberId],
    queryFn: ({ signal }) => getReportTypes(signal),
    enabled: open,
    retry: false,
  });
  const report = useMutation({
    mutationFn: async (input: ReportInput) => {
      const signal = getReportSessionSignal();
      await withdrawal.assertAllowed();
      if (client.getQueryData<User | null>(authKeys.me())?.id !== memberId) {
        throw new Error('로그인 정보가 변경되었습니다. 다시 로그인해 주세요.');
      }
      await submitReport(reviewId, input, signal);
    },
    retry: false,
    gcTime: 0,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshAtMidnight = () => {
      timer = setTimeout(() => {
        void client.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
        refreshAtMidnight();
      }, msUntilSeoulMidnight(Date.now()));
    };
    refreshAtMidnight();
    return () => clearTimeout(timer);
  }, [client, reviewId]);

  const updateReported = async () => {
    const key = reviewKeys.detail(reviewId);
    await client.cancelQueries({ queryKey: key });
    if (client.getQueryData<User | null>(authKeys.me())?.id !== memberId) return;
    client.setQueryData<ReviewDetail>(key, (current) =>
      current && { ...current, isReported: true, isReportedToday: true });
    dialog.current?.close();
    void client.invalidateQueries({ queryKey: key });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = types.data?.find(({ id }) => String(id) === reportTypeId);
    const detail = reason.trim();
    if (submitting.current || !selected || !detail || detail.length > 1000 ||
        types.isError || types.isFetching || withdrawal.blocked || review.isReportedToday) return;

    submitting.current = true;
    setError('');
    try {
      await report.mutateAsync({ reportTypeId: selected.id, reason: detail });
      await updateReported();
    } catch (cause: unknown) {
      if (client.getQueryData<User | null>(authKeys.me())?.id !== memberId) return;
      if (cause instanceof ApiError && cause.status === 409) {
        await updateReported();
        return;
      }
      setError(cause instanceof Error ? cause.message : '신고에 실패했습니다.');
      if (cause instanceof ApiError && (cause.status === 400 || cause.status === 404)) {
        const refreshed = await types.refetch();
        if (refreshed.data && !refreshed.data.some(({ id }) => id === selected.id)) {
          setReportTypeId('');
        }
        if (cause.status === 404) {
          void client.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
        }
      }
    } finally {
      submitting.current = false;
    }
  };

  const selected = types.data?.some(({ id }) => String(id) === reportTypeId);
  const reasonLength = reason.trim().length;

  return (
    <>
      {review.isReportedToday ? <span role='status'>오늘 신고 완료</span> : (
        <button
          type='button'
          aria-haspopup='dialog'
          className='cursor-pointer underline disabled:cursor-not-allowed disabled:opacity-50'
          disabled={withdrawal.blocked}
          onClick={() => {
            setOpen(true);
            dialog.current?.showModal();
          }}
        >
          신고하기
        </button>
      )}
      {withdrawal.data?.scheduledAt && <span>{WITHDRAWAL_RESTRICTION}</span>}
      <dialog
        ref={dialog}
        aria-labelledby='review-report-title'
        className='m-auto w-[min(90vw,28rem)] rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-800 backdrop:bg-black/40'
        onCancel={(event) => { if (submitting.current) event.preventDefault(); }}
        onClose={() => {
          setOpen(false);
          setReportTypeId('');
          setReason('');
          setError('');
        }}
      >
        <h2 id='review-report-title' className='text-lg font-semibold'>리뷰 신고</h2>
        <form className='mt-4 space-y-4' onSubmit={submit}>
          <label className='block'>
            신고 사유
            <select
              className='mt-1 block w-full rounded-lg border border-stone-300 p-2'
              value={selected ? reportTypeId : ''}
              onChange={(event) => setReportTypeId(event.target.value)}
              disabled={types.isFetching || types.isError || report.isPending}
              required
            >
              <option value=''>사유를 선택해 주세요</option>
              {types.data?.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          {types.isFetching && <p role='status'>신고 사유를 불러오는 중입니다.</p>}
          {types.isError && (
            <p role='alert'>
              신고 사유를 불러오지 못했습니다.{' '}
              <button className='cursor-pointer underline' type='button' onClick={() => void types.refetch()}>다시 시도</button>
            </p>
          )}
          {!types.isFetching && !types.isError && types.data?.length === 0 &&
            <p role='status'>현재 선택할 수 있는 신고 사유가 없습니다.</p>}
          <label className='block'>
            상세 내용
            <textarea
              className='mt-1 block min-h-28 w-full rounded-lg border border-stone-300 p-2'
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={report.isPending}
              aria-invalid={reasonLength > 1000}
              aria-describedby='review-report-reason-length'
              required
            />
            <span id='review-report-reason-length' className='mt-1 block text-xs'>
              {reasonLength > 1000 ? '상세 내용은 1,000자까지 입력할 수 있습니다.' : `${reasonLength} / 1,000자`}
            </span>
          </label>
          {error && <p role='alert' className='text-rose-700'>{error}</p>}
          <div className='flex justify-end gap-3'>
            <button type='button' className='cursor-pointer disabled:cursor-not-allowed' disabled={report.isPending} onClick={() => {
              if (!submitting.current) dialog.current?.close();
            }}>취소</button>
            <button
              className='cursor-pointer rounded-lg bg-rose-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50'
              disabled={!selected || reasonLength === 0 || reasonLength > 1000 || types.isError || types.isFetching ||
                report.isPending || withdrawal.blocked || review.isReportedToday}
            >
              {report.isPending ? '신고 중' : '신고 제출'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
};

export default ReviewReport;
