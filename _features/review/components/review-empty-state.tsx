'use client';

import ReviewWriteLink from '@/_features/review/components/review-write-link';

type ReviewEmptyStateProps = {
  variant: 'search' | 'member';
  hasFilters: boolean;
  onReset: () => void;
};

const ReviewEmptyState = ({ variant, hasFilters, onReset }: ReviewEmptyStateProps) => (
  <div className='mt-5 rounded-2xl border border-dashed border-[#dfe8df] bg-[#edf3ec]/50 px-6 py-12 text-center'>
    <p className='text-sm font-medium text-stone-700'>
      {hasFilters
        ? '일치하는 리뷰가 없습니다.'
        : variant === 'member'
          ? '아직 작성한 리뷰가 없습니다.'
          : '아직 등록된 리뷰가 없습니다.'}
    </p>
    <p className='mt-2 text-xs leading-6 text-stone-500'>
      {hasFilters
        ? variant === 'search'
          ? '다른 검색어나 카테고리로 찾아보세요.'
          : '다른 카테고리로 찾아보세요.'
        : '직접 써본 경험을 첫 리뷰로 남겨보세요.'}
    </p>
    {hasFilters ? (
      <button
        type='button'
        onClick={onReset}
        className='mt-5 cursor-pointer rounded-sm text-xs font-semibold text-[#23745b] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700'
      >
        {variant === 'search' ? '검색·카테고리 초기화' : '카테고리 초기화'}
      </button>
    ) : (
      <ReviewWriteLink
        className='mt-5 inline-flex rounded-full bg-[#23745b] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#185b46] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b]'
      >
        첫 리뷰 쓰기
      </ReviewWriteLink>
    )}
  </div>
);

export default ReviewEmptyState;
