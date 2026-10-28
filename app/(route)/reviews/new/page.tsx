import { Suspense } from 'react';
import ReviewWriter from '../../../../_features/review/components/form/review-writer';

const NewReviewPage = () => (
  <Suspense
    fallback={
      <main className='grid min-h-screen place-items-center bg-[#fafbf9] text-sm text-[#61735f]'>
        <p role='status'>리뷰 작성기를 준비하고 있습니다…</p>
      </main>
    }
  >
    <ReviewWriter />
  </Suspense>
);

export default NewReviewPage;
