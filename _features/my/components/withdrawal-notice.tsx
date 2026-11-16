'use client';

import { useWithdrawal, WITHDRAWAL_RESTRICTION } from '../hooks/use-withdrawal';
import LoadingSpinner from '@/_features/common/components/loading-spinner';

const WithdrawalNotice = () => {
  const status = useWithdrawal();
  if (!status.blocked) return null;
  if (status.isPending) return <LoadingSpinner />;
  if (!status.isError && !status.data?.scheduledAt) return null;
  const message = status.isError
    ? '탈퇴 예약 상태를 확인하지 못했습니다. 확인 후 다시 이용해 주세요.'
    : WITHDRAWAL_RESTRICTION;
  return (
    <div
      role={status.isError ? 'alert' : 'status'}
      className='my-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-stone-700'
    >
      <p>{message}</p>
      {status.isError && (
        <button
          type='button'
          disabled={status.isFetching}
          onClick={() => void status.refetch()}
          className='mr-4 underline'
        >
          다시 확인
        </button>
      )}
    </div>
  );
};

export default WithdrawalNotice;
