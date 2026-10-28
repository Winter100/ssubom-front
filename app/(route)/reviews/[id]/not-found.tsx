import Link from 'next/link';

const ReviewNotFound = () => (
  <main className='w-full flex-1 bg-[#fafbf9] font-sans text-[#202a26]'>
    <div className='mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14'>
      <div className='mx-auto max-w-sm text-center'>
        <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
          REVIEW NOT FOUND
        </p>
        <p aria-hidden='true' className='mt-4 text-6xl leading-none font-bold tracking-tighter text-[#dce7db]'>
          404
        </p>
        <h1 className='mt-5 text-xl font-bold tracking-tight'>
          리뷰를 찾을 수 없어요
        </h1>
        <p className='mt-3 text-sm leading-6 text-stone-500'>
          삭제되었거나 존재하지 않는 리뷰입니다.
          <br />
          주소를 확인하거나 다른 리뷰를 둘러보세요.
        </p>
        <div className='mt-6 flex flex-wrap justify-center gap-2'>
          <Link href='/reviews' className='rounded-full bg-[#23745b] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1b5c48] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b]'>
            리뷰 둘러보기 <span aria-hidden='true'>→</span>
          </Link>
          <Link href='/' className='rounded-full border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b]'>
            홈으로 가기
          </Link>
        </div>
        <p className='mt-6 text-xs text-[#7a8e78]'>다음 리뷰에서 새로운 경험을 만나보세요.</p>
      </div>
    </div>
  </main>
);

export default ReviewNotFound;
