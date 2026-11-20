import { ApiError } from '@/_lib/api/api';

export const inputClass = 'w-full min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#23745b]';
export const actionClass = 'cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-not-allowed disabled:opacity-50';
export const primaryActionClass = 'cursor-pointer rounded-lg bg-[#23745b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#185b46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-not-allowed disabled:opacity-50';
export const rowClass = 'min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5';
export const filterClass = 'flex flex-wrap items-end gap-3 rounded-2xl border border-[#dfe8df] bg-[#f3f6ef] p-4 sm:p-5';
export const emptyClass = 'rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500';

export const AdminListState = ({ error, pending, onRetry }: {
  error: Error | null;
  pending: boolean;
  onRetry: () => void;
}) => {
  if (pending) return <p role='status'>불러오는 중입니다.</p>;
  if (!error) return null;
  if (error instanceof ApiError && error.status === 403) {
    return <p role='alert'>관리자 권한이 필요합니다.</p>;
  }
  return (
    <p role='alert'>
      {error.message}{' '}
      <button type='button' className='underline' onClick={onRetry}>다시 시도</button>
    </p>
  );
};
