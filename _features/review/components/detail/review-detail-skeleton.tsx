const ReviewDetailSkeleton = () => (
  <div role='status' aria-busy='true' className='motion-safe:animate-pulse'>
    <span className='sr-only'>리뷰 상세를 불러오는 중입니다.</span>
    <div
      aria-hidden='true'
      className='grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_270px]'
    >
      <div className='min-w-0'>
        <div className='mb-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
          <div className='h-3 w-28 rounded bg-stone-200' />
          <div className='mt-5 h-9 w-4/5 max-w-3xl rounded bg-stone-200 sm:h-10' />
          <div className='mt-4 flex flex-wrap items-center gap-3'>
            <div className='size-6 rounded-full bg-stone-200' />
            <div className='h-3 w-20 rounded bg-stone-200' />
            <div className='h-3 w-10 rounded bg-stone-200' />
            <div className='ml-auto h-3 w-24 rounded bg-stone-200' />
          </div>
        </div>
        <div className='rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
          <div className='h-3 w-40 rounded bg-stone-200' />
          <div className='mt-2 h-6 w-24 rounded bg-stone-200' />
          <div className='mt-5 aspect-[16/9] w-full rounded-xl bg-stone-200' />
        </div>
        <div className='my-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
          <div className='h-3 w-40 rounded bg-stone-200' />
          <div className='mt-2 h-6 w-36 rounded bg-stone-200' />
          <div className='mt-5 space-y-4'>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className='h-4 rounded bg-stone-200 last:w-2/3' />
            ))}
          </div>
        </div>
        <div className='mt-10 grid gap-4 sm:grid-cols-2'>
          {['bg-[#edf3ec]', 'bg-[#f1eee6]'].map((tone) => (
            <div key={tone} className={`rounded-2xl p-5 sm:p-6 ${tone}`}>
              <div className='h-4 w-36 rounded bg-stone-300/50' />
              <div className='mt-4 h-16 rounded-xl bg-white/40' />
            </div>
          ))}
        </div>
        <div className='my-10 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
          <div className='h-3 w-36 rounded bg-stone-200' />
          <div className='mt-3 h-6 w-36 rounded bg-stone-200' />
          <div className='mt-3 h-40 rounded-xl bg-stone-100' />
        </div>
      </div>
      <div className='space-y-5 lg:sticky lg:top-8'>
        <div className='rounded-2xl border border-stone-200 bg-white p-6'>
          <div className='h-3 w-32 rounded bg-stone-200' />
          <div className='mt-3 h-6 w-24 rounded bg-stone-200' />
          <div className='mt-5 space-y-4'>
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className='flex justify-between gap-4'>
                <div className='h-3 w-16 rounded bg-stone-200' />
                <div className='h-3 w-20 rounded bg-stone-200' />
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-2xl border border-[#dfe8df] bg-[#edf3ec] p-6'>
          <div className='h-3 w-32 rounded bg-stone-300/50' />
          <div className='mt-3 h-6 rounded bg-stone-300/50' />
          <div className='mt-5 space-y-2'>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className='h-10 rounded-xl bg-white/40' />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ReviewDetailSkeleton;
