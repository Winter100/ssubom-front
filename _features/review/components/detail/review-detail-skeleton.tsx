const ReviewDetailSkeleton = () => (
  <div role='status' aria-busy='true' className='motion-safe:animate-pulse'>
    <span className='sr-only'>리뷰 상세를 불러오는 중입니다.</span>
    <div aria-hidden='true'>
      <div className='mb-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
        <div className='h-7 w-20 rounded-full bg-stone-200' />
        <div className='mt-4 h-10 w-4/5 max-w-3xl rounded bg-stone-200' />
        <div className='mt-5 flex items-center gap-4'>
          <div className='size-8 rounded-full bg-stone-200' />
          <div className='h-4 w-20 rounded bg-stone-200' />
          <div className='h-4 w-20 rounded bg-stone-200' />
        </div>
      </div>
      <div className='grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_270px]'>
      <div>
      <div className='rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
        <div className='aspect-[16/9] w-full rounded-xl bg-stone-200' />
      </div>
      <div className='space-y-4'>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className='h-4 rounded bg-stone-200 last:w-2/3' />
        ))}
      </div>
      <div className='mt-10 grid gap-4 sm:grid-cols-2'>
        <div className='h-40 rounded-2xl bg-stone-200' />
        <div className='h-40 rounded-2xl bg-stone-200' />
      </div>
      </div>
      <div className='h-64 rounded-2xl border border-stone-200 bg-stone-100 p-6'>
        <div className='h-4 w-32 rounded bg-stone-200' />
        <div className='mt-5 h-7 rounded bg-stone-200' />
        <div className='mt-6 space-y-4'>
          <div className='h-4 rounded bg-stone-200' />
          <div className='h-4 rounded bg-stone-200' />
          <div className='h-4 rounded bg-stone-200' />
        </div>
      </div>
      </div>
    </div>
  </div>
);

export default ReviewDetailSkeleton;
