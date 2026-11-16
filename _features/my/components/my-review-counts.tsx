'use client';

import LoadingSpinner from '@/_features/common/components/loading-spinner';

import CategoryLabel from '@/_features/review/components/category-label';
import { useMyReviewCounts } from '../hooks/use-my';

type MyReviewCountsProps = {
  categoryId?: number;
  onCategoryChange: (categoryId: number | undefined) => void;
  onReset: () => void;
};

const MyReviewCounts = ({
  categoryId,
  onCategoryChange,
  onReset,
}: MyReviewCountsProps) => {
  const { data, isPending, isError, refetch } = useMyReviewCounts();

  return (
    <section aria-labelledby='my-review-counts-title' className='min-w-0'>
      <div className='flex items-center justify-between gap-2'>
        <h2
          id='my-review-counts-title'
          className='text-sm font-semibold text-stone-800'
        >
          카테고리별 작성 리뷰
        </h2>
        <button
          type='button'
          aria-label='내 리뷰 필터 초기화'
          title='필터 초기화'
          onClick={onReset}
          className='grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#23745b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
        >
          <svg
            aria-hidden='true'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.7'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='size-3.5'
          >
            <path d='M20 7v5h-5M4 17v-5h5' />
            <path d='M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9' />
          </svg>
        </button>
      </div>
      <div className='mt-2 rounded-xl border border-stone-200/80 p-2'>
        {isPending ? (
          <LoadingSpinner />
        ) : isError ? (
          <div role='alert' className='text-sm text-stone-500'>
            <p>작성 개수를 불러오지 못했습니다.</p>
            <button
              type='button'
              onClick={() => void refetch()}
              className='mt-3 cursor-pointer rounded-sm font-medium text-[#23745b] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4'
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div
            role='group'
            aria-label='내 리뷰 카테고리 필터'
            className='grid grid-cols-2 gap-2'
          >
            {[
              {
                categoryId: undefined,
                category: '전체',
                count: data.reduce((total, item) => total + item.count, 0),
              },
              ...data,
            ].map((item) => (
              <button
                key={item.categoryId ?? 'all'}
                type='button'
                aria-pressed={categoryId === item.categoryId}
                onClick={() => onCategoryChange(item.categoryId)}
                className={`flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${categoryId === item.categoryId ? 'bg-[#6aaa88] text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
              >
                <span className='min-w-0 break-words'>
                  <CategoryLabel category={item.category} />
                </span>
                <span className='shrink-0 text-right font-semibold tabular-nums'>
                  {item.count.toLocaleString('ko-KR')}개
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyReviewCounts;
