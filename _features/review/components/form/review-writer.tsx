'use client';

import {
  useReviewWriter,
  type ReviewWriterOptions,
} from '../../hooks/use-review-writer';
import ReviewWriterForm from './review-writer-form';
import { useCategories } from '../../hooks/use-review';
import ReviewDetailBackButton from '../detail/review-detail-back-button';

const ReviewWriter = ({
  initialReview,
  onSubmit,
  submitting,
}: ReviewWriterOptions) => {
  const isEditing = initialReview !== undefined;
  const {
    fields,
    // message,
    // error,
    readingImage,
    isSubmitting,
    resetVersion,
    editor,
    changeField,
    handleImage,
    saveDraft,
    submitReview,
  } = useReviewWriter({ initialReview, onSubmit, submitting });

  const { data } = useCategories();

  return (
    <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
      <main className='mx-auto max-w-6xl px-5 py-9 sm:px-10 sm:py-12'>
        <ReviewDetailBackButton />
        <div className='mt-7 mb-8'>
          <p className='text-[10px] font-semibold tracking-[0.18em] text-[#7b8b7c]'>
            WRITE YOUR EXPERIENCE
          </p>
          <h1 className='mt-3 text-3xl font-bold tracking-tight'>
            {isEditing ? '리뷰를 수정해 주세요.' : '써본 이야기를 들려주세요.'}
          </h1>
          <p className='mt-3 text-xs leading-6 text-stone-500'>
            작은 경험 하나가 누군가의 선택에 도움이 될 수 있어요.
            <br />
            {isEditing
              ? '수정한 내용과 이미지를 확인한 뒤 저장해 주세요.'
              : '작성한 내용을 확인한 뒤 등록해 주세요.'}
          </p>
        </div>
        <ReviewWriterForm
          key={resetVersion}
          fields={fields}
          changeField={changeField}
          editor={editor}
          readingImage={readingImage}
          isSubmitting={isSubmitting}
          handleImage={handleImage}
          submitReview={submitReview}
          saveDraft={isEditing ? undefined : saveDraft}
          submitLabel={isEditing ? '수정' : '등록'}
          categoryList={data ?? []}
        />
      </main>
    </div>
  );
};

export default ReviewWriter;
