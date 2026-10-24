const ReviewListSkeleton = ({ count }: { count: number }) => (
  <div aria-busy='true' aria-label='리뷰 목록을 불러오는 중'>
    <p role='status' className='sr-only'>
      리뷰를 불러오는 중입니다.
    </p>
    <div className='divide-y divide-stone-200/70'>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-review-skeleton
          aria-hidden='true'
          className='grid gap-5 py-7 motion-safe:animate-pulse sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-6'
        >
          <div className='aspect-[4/3] rounded-2xl bg-stone-200 sm:self-start' />
          <div className='flex min-w-0 flex-col py-1'>
            <div className='flex items-center justify-between gap-3'>
              <div className='h-3 w-16 rounded bg-stone-200' />
              <div className='h-4 w-12 rounded bg-stone-200' />
            </div>
            <div className='mt-3 h-6 w-4/5 rounded bg-stone-200' />
            <div className='mt-2 h-6 w-3/5 rounded bg-stone-200' />
            <div className='mt-4 flex items-center gap-3'>
              <div className='size-6 rounded-full bg-stone-200' />
              <div className='h-3 w-20 rounded bg-stone-200' />
              <div className='ml-auto h-3 w-16 rounded bg-stone-200' />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ReviewListSkeleton;
