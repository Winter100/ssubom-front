'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReviewWriter,
  type ReviewWriterOptions,
} from '../../hooks/use-review-writer';
import ReviewWriterForm from './review-writer-form';
import { useCategories } from '../../hooks/use-review';
import ReviewDetailBackButton from '../detail/review-detail-back-button';
import WithdrawalNotice from '@/_features/my/components/withdrawal-notice';
import { useWithdrawal } from '@/_features/my/hooks/use-withdrawal';
import LoadingSpinner from '@/_features/common/components/loading-spinner';

const ReviewWriter = (props: ReviewWriterOptions) => {
  const withdrawal = useWithdrawal();
  const router = useRouter();
  const redirectToMyPage = !props.initialReview && Boolean(withdrawal.data?.scheduledAt);

  useEffect(() => {
    if (redirectToMyPage) router.replace('/mypage');
  }, [redirectToMyPage, router]);

  if (!props.initialReview && (withdrawal.blocked || redirectToMyPage)) {
    return (
      <main className='mx-auto max-w-6xl px-5 py-9 sm:px-10 sm:py-12'>
        {redirectToMyPage ? (
          <LoadingSpinner />
        ) : <WithdrawalNotice />}
      </main>
    );
  }

  return <ReviewWriterContent {...props} />;
};

const ReviewWriterContent = ({
  initialReview,
  onSubmit,
  submitting,
}: ReviewWriterOptions) => {
  const isEditing = initialReview !== undefined;
  const withdrawal = useWithdrawal();
  const {
    fields,
    error,
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
        <WithdrawalNotice />
        {error && (
          <p role='alert' className='mb-4 text-sm text-red-700'>
            {error}
          </p>
        )}
        <ReviewWriterForm
          key={resetVersion}
          fields={fields}
          changeField={changeField}
          editor={editor}
          readingImage={readingImage}
          isSubmitting={isSubmitting}
          contentBlocked={withdrawal.blocked}
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
