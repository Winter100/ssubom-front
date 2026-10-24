import ReviewFeedClient from './review-feed-client';
import Link from 'next/link';

const ReviewFeed = () => (
  <section
    id='reviews'
    aria-labelledby='reviews-title'
    className='min-w-0 scroll-mt-6'
  >
    <p className='mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#7b8b7c]'>
      THE REVIEW FEED
    </p>
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <h2 id='reviews-title' className='text-2xl font-bold tracking-tight'>
        요즘, 써본 이야기
      </h2>
      <Link
        href='/reviews'
        className='text-xs font-medium text-[#23745b] hover:underline hover:underline-offset-4'
      >
        전체 리뷰 보기 ↗
      </Link>
    </div>
    <div className='mt-6 border-t border-stone-200'>
      <ReviewFeedClient />
    </div>
  </section>
);

export default ReviewFeed;
