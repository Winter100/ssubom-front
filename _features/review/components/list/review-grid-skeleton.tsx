const ReviewGridSkeleton = ({ count }: { count: number }) => (
  <div aria-busy='true' aria-label='리뷰 목록을 불러오는 중'>
    <span role='status' className='sr-only'>리뷰를 불러오는 중입니다.</span>
    <div className='grid grid-cols-1 gap-5 py-7 sm:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-review-skeleton
          aria-hidden='true'
          className='overflow-hidden rounded-3xl border border-stone-200 bg-white motion-safe:animate-pulse'
        >
          <div className='aspect-4/3 bg-stone-200' />
          <div className='space-y-4 p-5 sm:p-6'>
            <div className='flex justify-between gap-3'>
              <div className='h-3 w-16 rounded bg-stone-200' />
              <div className='h-3 w-12 rounded bg-stone-200' />
            </div>
            <div className='h-6 w-4/5 rounded bg-stone-200' />
            <div className='h-3 w-3/5 rounded bg-stone-200' />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ReviewGridSkeleton;
