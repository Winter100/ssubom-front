'use client';

import { useMe } from '@/_features/auth/hooks/use-auth';
import { useIsMutating } from '@tanstack/react-query';
import { useInsertLike, useDeleteLike } from '../../hooks/use-review';
import { reviewKeys } from '../../constant/review.keys';
import { HelpfulHeart } from '../review-helpful-count';
import LoadingSpinner from '@/_features/common/components/loading-spinner';
import { useWithdrawal } from '@/_features/my/hooks/use-withdrawal';

type ReviewHelpfulProps = {
  reviewId: string;
  isLike: boolean;
  countLike: number;
};

const ReviewHelpful = ({ reviewId, isLike, countLike }: ReviewHelpfulProps) => {
  const { data: user, isPending, isError } = useMe();
  const withdrawal = useWithdrawal();
  const insertLike = useInsertLike(reviewId);
  const deleteLike = useDeleteLike(reviewId);
  const isUpdating =
    useIsMutating({ mutationKey: [...reviewKeys.all, 'like', reviewId] }) > 0;
  const authenticated = !isPending && !isError && user != null;
  const canReact = authenticated && !withdrawal.blocked;
  const selected = authenticated && isLike;

  return (
    <div className='mt-5 border-t border-stone-100 pt-5'>
      <button
        type='button'
        disabled={!canReact || isUpdating}
        aria-pressed={selected}
        onClick={() => {
          if (!canReact || isUpdating) return;
          if (selected) deleteLike.mutate();
          else insertLike.mutate();
        }}
        className='mx-auto flex w-fit cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-rose-200 aria-pressed:bg-rose-50 aria-pressed:text-rose-700 aria-pressed:hover:bg-rose-100'
      >
        <HelpfulHeart selected={selected} />
        <span>도움됐어요</span>
        <span className='tabular-nums'>
          {countLike.toLocaleString('ko-KR')}
        </span>
      </button>
      {withdrawal.data?.scheduledAt && (
        <p className='mt-2 text-center text-[11px] text-stone-500'>
          탈퇴 예약 중에는 변경할 수 없습니다.
        </p>
      )}
      {isPending ? (
        <LoadingSpinner />
      ) : (
        !authenticated && (
          <p className='mt-2 text-center text-[11px] text-stone-500'>
            로그인 후 도움됐어요를 누를 수 있습니다.
          </p>
        )
      )}
    </div>
  );
};

export default ReviewHelpful;
