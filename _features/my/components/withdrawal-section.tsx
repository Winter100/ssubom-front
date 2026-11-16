'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/_lib/api/api';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import { useWithdrawal, useWithdrawalAction } from '../hooks/use-withdrawal';
import LoadingSpinner from '@/_features/common/components/loading-spinner';

const formatDate = (value: string): string =>
  new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

const WithdrawalSection = ({ memberId }: { memberId: number }) => {
  const status = useWithdrawal();
  const action = useWithdrawalAction(memberId);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'request' | 'cancel'>('request');
  const [error, setError] = useState('');
  const scheduledAt = status.data?.scheduledAt;
  const reserved = Boolean(scheduledAt);
  useEffect(() => {
    if (error && !action.isPending) passwordInput.current?.focus();
  }, [error, action.isPending]);
  const reset = (): void => {
    setPassword('');
    setError('');
    action.reset();
  };
  const close = (): void => {
    if (!lock.current) dialog.current?.close();
  };
  const open = (): void => {
    reset();
    setMode(reserved ? 'cancel' : 'request');
    dialog.current?.showModal();
  };
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (lock.current || (mode === 'request' && !password.trim())) return;
    lock.current = true;
    setError('');
    try {
      await action.mutateAsync(
        mode === 'request' ? { type: mode, password } : { type: mode },
      );
      dialog.current?.close();
    } catch (cause: unknown) {
      setPassword('');
      action.reset();
      setError(
        getAuthErrorMessage(
          cause,
          '요청을 처리하지 못했습니다. 상태를 다시 확인해 주세요.',
        ),
      );
      if (!(cause instanceof ApiError && cause.status === 400)) {
        await status.refetch();
      }
    } finally {
      lock.current = false;
      setPassword('');
      action.reset();
    }
  };
  return (
    <section
      aria-label='회원 탈퇴'
      className='mt-6 border-t border-stone-100 pt-5 text-xs leading-6 text-stone-500'
    >
      {status.isPending ? (
        <LoadingSpinner />
      ) : status.isError ? (
        <div role='alert'>
          <p>탈퇴 예약 상태를 불러오지 못했습니다.</p>
          <button
            type='button'
            disabled={status.isFetching}
            onClick={() => void status.refetch()}
            className='cursor-pointer underline disabled:cursor-not-allowed'
          >
            다시 확인
          </button>
        </div>
      ) : (
        <div
          className={
            reserved
              ? 'flex flex-col gap-4 rounded-2xl border border-[#dfe8df] bg-[#edf3ec]/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'
              : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          }
        >
          <div className='min-w-0'>
            <h3 className='text-sm font-semibold text-stone-700'>
              {reserved ? '탈퇴가 예약되어 있습니다.' : '계정 관리'}
            </h3>
            {scheduledAt ? (
              <>
                <p className='mt-1 font-medium text-[#405b49]'>
                  탈퇴 예정: {formatDate(scheduledAt)} (한국 시간)
                </p>
                <p className='mt-2'>
                  예정 시각 이후 순차 처리됩니다. 로그인만으로 예약이 취소되지
                  않습니다.
                </p>
                <p>
                  예약 중에는 댓글·답글 작성·수정·삭제, 리뷰 작성·수정·삭제, 도움됐어요 변경이 제한됩니다.
                </p>
              </>
            ) : (
              <p className='mt-1'>계정을 더 이상 사용하지 않으시나요?</p>
            )}
          </div>
          <button
            ref={trigger}
            type='button'
            aria-haspopup='dialog'
            className={`w-full shrink-0 cursor-pointer rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto ${
              reserved
                ? 'border-[#23745b] bg-[#23745b] text-white hover:border-[#185b46] hover:bg-[#185b46] focus-visible:outline-[#23745b]'
                : 'border-stone-200 bg-white text-stone-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-red-600'
            }`}
            onClick={open}
          >
            {reserved ? '탈퇴 예약 취소' : '회원 탈퇴'}
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby='withdrawal-title'
        aria-describedby='withdrawal-description'
        aria-busy={action.isPending}
        onCancel={(event) => {
          if (lock.current) event.preventDefault();
        }}
        onClose={() => {
          reset();
          trigger.current?.focus();
        }}
        className='m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 text-stone-700 shadow-xl backdrop:bg-stone-900/40'
      >
        <form onSubmit={(event) => void submit(event)}>
          <h2 id='withdrawal-title' className='text-lg font-semibold'>
            {mode === 'request'
              ? '회원 탈퇴를 예약하시겠어요?'
              : '탈퇴 예약을 취소하시겠어요?'}
          </h2>
          <div
            id='withdrawal-description'
            className='mt-4 space-y-2 rounded-xl bg-stone-50 p-4 text-sm leading-7 text-stone-500'
          >
            {mode === 'request' ? (
              <>
                <p>
                  탈퇴가 최종 처리되면 회원님이 작성한 모든 게시글(리뷰)은
                  자동으로 삭제되며, 복구할 수 없습니다.
                </p>
                <p>
                  다른 리뷰에 남긴 댓글은 작성자 정보와 내용이 제거되어 삭제된
                  댓글로 표시됩니다.
                </p>
                <p>
                  탈퇴는 즉시 처리되지 않습니다. 예약 중에도 로그인할 수 있지만
                  댓글·답글 작성·수정·삭제, 리뷰 작성·수정·삭제, 도움됐어요 변경은 제한됩니다.
                </p>
                <p>
                  로그인만으로 예약이 취소되지 않습니다. 마이페이지에서 직접
                  취소해 주세요.
                </p>
              </>
            ) : (
              <p>
                예약을 취소하면 댓글 작성·수정·삭제, 리뷰 작성·수정·삭제, 도움됐어요를 다시 이용하실
                수 있습니다.
              </p>
            )}
          </div>
          {mode === 'request' && (
            <div className='mt-5'>
              <label
                htmlFor='withdrawal-password'
                className='block text-sm font-medium'
              >
                현재 비밀번호
              </label>
              <input
                ref={passwordInput}
                id='withdrawal-password'
                type='password'
                autoComplete='current-password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={action.isPending}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'withdrawal-error' : undefined}
                className='mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-[#23745b] disabled:opacity-50'
              />
            </div>
          )}
          {error && (
            <p
              id='withdrawal-error'
              role='alert'
              className='mt-3 text-sm text-red-700'
            >
              {error}
            </p>
          )}
          <div className='mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end'>
            <button
              type='button'
              disabled={action.isPending}
              onClick={close}
              className='cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-not-allowed disabled:opacity-50'
            >
              닫기
            </button>
            <button
              type='submit'
              disabled={
                action.isPending || (mode === 'request' && !password.trim())
              }
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === 'request'
                  ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                  : 'bg-[#23745b] hover:bg-[#185b46] focus-visible:outline-[#23745b]'
              }`}
            >
              {action.isPending
                ? '처리 중…'
                : mode === 'request'
                  ? '탈퇴 예약하기'
                  : '예약 취소하기'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
};

export default WithdrawalSection;
