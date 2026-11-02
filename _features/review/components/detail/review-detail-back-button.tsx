'use client';

import { useRouter } from 'next/navigation';

const ReviewDetailBackButton = () => {
  const router = useRouter();

  const goBack = (): void => {
    if (window.history.length > 1) router.back();
    else router.replace('/reviews');
  };

  return (
    <button
      type='button'
      onClick={goBack}
      aria-label='이전 페이지로 돌아가기'
      className='group mb-5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfe8df] bg-white py-1.5 pl-1.5 pr-3 text-[11px] font-medium text-[#50755c] shadow-sm transition-colors hover:border-[#bdccba] hover:bg-[#edf3ec] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b]'
    >
      <span className='grid size-5 place-items-center rounded-full bg-[#edf3ec] transition-colors group-hover:bg-white'>
        <svg aria-hidden='true' viewBox='0 0 16 16' fill='none' className='size-3'>
          <path
            d='m7 4-4 4 4 4M3 8h10'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>
      뒤로
    </button>
  );
};

export default ReviewDetailBackButton;
