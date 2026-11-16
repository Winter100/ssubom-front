import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import { isValidReviewId } from '@/_features/review/lib/review-id';
import { notFound } from 'next/navigation';
import ReviewEditContent from './review-edit-content';
import LoadingSpinner from '@/_features/common/components/loading-spinner';

type EditParams = { params: Promise<{ id: string }> };

const Page = ({ params }: EditParams) => (
  <ReviewsQueryBoundary
    notFoundOn404
    forbiddenRedirectTo='/mypage'
    fallback={
      <LoadingSpinner />
    }
  >
    <ReviewEditPage params={params} />
  </ReviewsQueryBoundary>
);

const ReviewEditPage = async ({ params }: EditParams) => {
  const { id } = await params;
  if (!isValidReviewId(id)) notFound();
  return <ReviewEditContent key={id} id={id} />;
};

export default Page;
