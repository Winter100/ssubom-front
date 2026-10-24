import ReviewFeedClient from './review-feed-client';

const ReviewFeed = () => (
  <section
    id='reviews'
    aria-labelledby='reviews-title'
    className='min-w-0 scroll-mt-6'
  >
    <p className='mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#7b8b7c]'>
      THE REVIEW FEED
    </p>
    <h2 id='reviews-title' className='text-2xl font-bold tracking-tight'>
      요즘, 써본 이야기
    </h2>
    <div className='mt-6 border-t border-stone-200'>
      <ReviewFeedClient />
    </div>
  </section>
);

export default ReviewFeed;
