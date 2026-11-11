import type { Metadata } from 'next';
import ReviewSearchClient from '@/_features/review/components/review-search-client';

export const metadata: Metadata = { title: '리뷰 둘러보기 | 써봄' };

const ReviewsPage = () => (
  <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
    <main className='mx-auto w-full max-w-6xl px-5 py-10 sm:px-10 sm:py-14'>
      <h1 id='reviews-list-title' className='text-3xl font-bold tracking-tight'>
        리뷰 둘러보기
      </h1>
      <div className='mt-8'>
        <ReviewSearchClient />
      </div>
    </main>
  </div>
);

export default ReviewsPage;
