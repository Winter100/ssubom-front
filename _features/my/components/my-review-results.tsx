'use client';

import { useEffect, useRef, useState } from 'react';
import ReviewImageCard from '@/_features/review/components/review-image-card';
import ReviewEmptyState from '@/_features/review/components/review-empty-state';
import ReviewGridSkeleton from '@/_features/review/components/list/review-grid-skeleton';
import ReviewPagination from '@/_features/review/components/list/review-pagination';
import type { ReviewsParams, ReviewType } from '@/_types/review';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import { useMyReviews, useReviewDelete } from '../hooks/use-my';
import { useRouter } from 'next/navigation';

type MyReviewResultsProps = {
  params: ReviewsParams;
  onPageChange: (page: number) => void;
  onPageCorrection: (page: number) => void;
  onReset: () => void;
};

const MyReviewResults = ({
  params,
  onPageChange,
  onPageCorrection,
  onReset,
}: MyReviewResultsProps) => {
  const { data: reviewPage } = useMyReviews(params);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [selectedReview, setSelectedReview] = useState<Pick<
    ReviewType,
    'id' | 'title'
  > | null>(null);
  const deleting = useRef<boolean>(false);
  const {
    mutate: deleteReview,
    isPending: isDeleting,
    error: deleteError,
    reset: resetDelete,
  } = useReviewDelete();
  const router = useRouter();

  const closeDeleteDialog = (): void => {
    if (!deleting.current) deleteDialog.current?.close();
  };
  const confirmDelete = (): void => {
    if (!selectedReview || deleting.current) return;
    deleting.current = true;
    deleteReview(
      { reviewId: selectedReview.id },
      {
        onSuccess: () => deleteDialog.current?.close(),
        onSettled: () => {
          deleting.current = false;
        },
      },
    );
  };
  const hasFilters = params.categoryId !== undefined;
  const lastPage = Math.max(1, reviewPage.totalPages);
  const needsPageCorrection = params.page > lastPage;

  useEffect(() => {
    if (needsPageCorrection) onPageCorrection(lastPage);
  }, [needsPageCorrection, lastPage, onPageCorrection]);

  if (needsPageCorrection) return <ReviewGridSkeleton count={params.size} />;

  return (
    <>
      {reviewPage.content.length === 0 ? (
        <ReviewEmptyState variant='member' hasFilters={hasFilters} onReset={onReset} />
      ) : (
        <div className='grid grid-cols-1 gap-5 py-7 sm:grid-cols-2 lg:grid-cols-3'>
          {reviewPage.content.map((review) => (
            <ReviewImageCard
              key={review.id}
              review={review}
              actions={
                <div
                  role='group'
                  aria-label={`${review.title} 리뷰 관리`}
                  className='flex items-center gap-1'
                >
                  <button
                    type='button'
                    title='수정 기능'
                    onClick={() => router.push(`/reviews/edit/${review.id}`)}
                    aria-label={`${review.title} 수정`}
                    className='cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-stone-400 hover:bg-stone-50'
                  >
                    수정
                  </button>
                  <span aria-hidden='true' className='h-3 w-px bg-stone-200' />
                  <button
                    type='button'
                    aria-label={`${review.title} 삭제`}
                    aria-haspopup='dialog'
                    disabled={isDeleting}
                    onClick={() => {
                      resetDelete();
                      setSelectedReview({ id: review.id, title: review.title });
                      deleteDialog.current?.showModal();
                    }}
                    className='cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
                  >
                    삭제
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
      <dialog
        ref={deleteDialog}
        aria-labelledby='delete-review-title'
        aria-describedby='delete-review-description'
        aria-busy={isDeleting}
        onCancel={(event) => {
          if (deleting.current) event.preventDefault();
        }}
        onClose={() => {
          setSelectedReview(null);
          resetDelete();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDeleteDialog();
        }}
        className='fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-stone-200 bg-white p-0 text-stone-800 shadow-xl backdrop:bg-stone-900/40 backdrop:backdrop-blur-sm'
      >
        <div className='p-6 sm:p-7'>
          <div className='flex items-center justify-between gap-4'>
            <h2
              id='delete-review-title'
              className='text-lg font-semibold tracking-tight'
            >
              리뷰를 삭제할까요?
            </h2>
            <button
              type='button'
              aria-label='삭제 확인창 닫기'
              disabled={isDeleting}
              onClick={closeDeleteDialog}
              className='grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b]'
            >
              <span aria-hidden='true'>×</span>
            </button>
          </div>
          <p className='mt-5 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 font-medium break-all'>
            {selectedReview?.title}
          </p>
          <p
            id='delete-review-description'
            className='mt-4 text-sm leading-6 text-red-500 text-center'
          >
            삭제한 리뷰는 복구할 수 없습니다.
          </p>
          {deleteError && (
            <p
              role='alert'
              className='mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700'
            >
              {getAuthErrorMessage(
                deleteError,
                '리뷰를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
              )}
            </p>
          )}
          <div className='mt-6 flex justify-end gap-2'>
            <button
              type='button'
              autoFocus
              disabled={isDeleting}
              onClick={closeDeleteDialog}
              className='cursor-pointer rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-wait disabled:opacity-50'
            >
              취소
            </button>
            <button
              type='button'
              disabled={isDeleting || !selectedReview}
              onClick={confirmDelete}
              className='cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-50'
            >
              {isDeleting ? '삭제 중…' : '삭제'}
            </button>
          </div>
        </div>
      </dialog>
      {reviewPage.totalPages > 0 && (
        <>
          <ReviewPagination
            page={reviewPage.page}
            pageCount={reviewPage.totalPages}
            onPageChange={(page) => {
              if (page >= 1 && page <= reviewPage.totalPages) {
                onPageChange(page);
              }
            }}
          />
        </>
      )}
    </>
  );
};

export default MyReviewResults;
