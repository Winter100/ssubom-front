import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import { isValidReviewId } from '@/_features/review/lib/review-id';
import { notFound } from 'next/navigation';
import ReviewEditContent from './review-edit-content';

type EditParams = { params: Promise<{ id: string }> };

const Page = ({ params }: EditParams) => (
  <ReviewsQueryBoundary
    notFoundOn404
    fallback={
      <p role='status' className='py-20 text-center'>
        수정할 리뷰를 불러오는 중입니다…
      </p>
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
