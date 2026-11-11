export const HelpfulHeart = ({ selected = false }: { selected?: boolean }) => (
  <svg
    aria-hidden='true'
    viewBox='0 0 24 24'
    fill={selected ? 'currentColor' : 'none'}
    stroke='currentColor'
    strokeWidth='1.7'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='size-3.5 shrink-0'
  >
    <path d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z' />
  </svg>
);

const ReviewHelpfulCount = ({
  isLike,
  count,
}: {
  isLike: boolean;
  count: number;
}) => (
  <span
    aria-label={isLike ? '도움됐어요 선택됨' : '도움됐어요'}
    className={`inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${isLike ? 'text-rose-600' : 'text-stone-400'}`}
  >
    <HelpfulHeart selected={isLike} />
    {count}
  </span>
);

export default ReviewHelpfulCount;
