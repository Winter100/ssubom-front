import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import ReviewDetailClient from '@/_features/review/components/detail/review-detail-client';
import ReviewDetailSkeleton from '@/_features/review/components/detail/review-detail-skeleton';
import { notFound } from 'next/navigation';
import { isValidReviewId } from '@/_features/review/lib/review-id';

type ReviewDetailPageProps = { params: Promise<{ id: string }> };

const ReviewDetailContent = async ({ params }: ReviewDetailPageProps) => {
  const { id } = await params;
  if (!isValidReviewId(id)) notFound();

  return <ReviewDetailClient key={id} id={id} />;
};

const ReviewDetailPage = ({ params }: ReviewDetailPageProps) => (
  <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
    <main className='mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-10 sm:pt-10'>
      <ReviewsQueryBoundary notFoundOn404 fallback={<ReviewDetailSkeleton />}>
        <ReviewDetailContent params={params} />
      </ReviewsQueryBoundary>
    </main>
  </div>
);

export default ReviewDetailPage;
