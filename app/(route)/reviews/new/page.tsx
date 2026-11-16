import { Suspense } from 'react';
import LoadingSpinner from '@/_features/common/components/loading-spinner';
import ReviewWriter from '../../../../_features/review/components/form/review-writer';

const NewReviewPage = () => (
  <Suspense
    fallback={
      <main className='grid min-h-screen place-items-center bg-[#fafbf9] text-sm text-[#61735f]'>
        <LoadingSpinner />
      </main>
    }
  >
    <ReviewWriter />
  </Suspense>
);

export default NewReviewPage;
