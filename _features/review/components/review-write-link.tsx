'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useWithdrawal, WITHDRAWAL_RESTRICTION } from '@/_features/my/hooks/use-withdrawal';

type ReviewWriteLinkProps = {
  children: ReactNode;
  className: string;
  disableWhenReserved?: boolean;
};

const ReviewWriteLink = ({ children, className, disableWhenReserved = false }: ReviewWriteLinkProps) => {
  const status = useWithdrawal();
  if (status.data?.scheduledAt) {
    if (disableWhenReserved) {
      return (
        <button
          type='button'
          disabled
          title={WITHDRAWAL_RESTRICTION}
          className={`${className} w-full cursor-not-allowed text-left opacity-50 disabled:hover:bg-transparent disabled:hover:text-stone-400`}
        >
          {children}
        </button>
      );
    }
    return (
      <Link href='/mypage' prefetch={false} title={WITHDRAWAL_RESTRICTION} className={className}>
        {children}
      </Link>
    );
  }
  return status.blocked ? (
    <span
      aria-disabled='true'
      title={status.data?.scheduledAt ? WITHDRAWAL_RESTRICTION : '탈퇴 예약 상태 확인 후 이용해 주세요.'}
      className={`${className} cursor-not-allowed opacity-50`}
    >
      {children}
    </span>
  ) : <Link href='/reviews/new' prefetch={false} className={className}>{children}</Link>;
};

export default ReviewWriteLink;
