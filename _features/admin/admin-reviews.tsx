import Link from 'next/link';
import { WITHDRAWAL_RESTRICTION } from '@/_features/my/hooks/use-withdrawal';
import AdminPagination from './admin-pagination';
import { actionClass, AdminListState, emptyClass, filterClass, inputClass, primaryActionClass, rowClass } from './admin-list-state';
import { useAdminReviews } from './hooks/use-admin-reviews';

const AdminReviews = ({ memberId, onViewReports }: {
  memberId: number;
  onViewReports: (id: number) => void;
}) => {
  const {
    reviews,
    categories,
    hasSearch,
    page,
    setPage,
    search,
    searchError,
    setSearchError,
    isWithdrawalScheduled,
    isDeletionBlocked,
    isDeleting,
    target,
    dialog,
    error,
    askToDelete,
    confirmDelete,
    preventDeleteDismiss,
    cancelDelete,
  } = useAdminReviews(memberId);

  return (
    <section aria-label='리뷰 관리' className='space-y-4'>
      <form className={filterClass} onSubmit={search}>
        <label className='grid min-w-0 gap-1 text-sm'>
          검색 기준
          <select name='searchType' className={inputClass}>
            <option value='title'>제목</option>
            <option value='author'>작성자</option>
          </select>
        </label>
        <label className='grid min-w-0 grow basis-48 gap-1 text-sm'>
          검색어
          <input name='query' className={inputClass} placeholder='제목 또는 작성자 이름' aria-invalid={Boolean(searchError)} aria-describedby={searchError ? 'admin-review-search-error' : undefined} onChange={() => setSearchError('')} />
        </label>
        <label className='grid min-w-0 max-w-full gap-1 text-sm'>
          카테고리
          <select name='categoryId' className={inputClass} disabled={!categories.isSuccess}>
            <option value=''>전체</option>
            {categories.data?.map(({ id, category }) => <option key={id} value={id}>{category}</option>)}
          </select>
        </label>
        <button className={primaryActionClass}>검색</button>
      </form>
      {searchError && <p id='admin-review-search-error' role='alert' className='text-sm text-rose-700'>{searchError}</p>}
      {categories.isError && (
        <p role='alert'>카테고리 조회에 실패했습니다.{' '}
          <button type='button' className='underline' onClick={() => void categories.refetch()}>다시 시도</button>
        </p>
      )}
      {isWithdrawalScheduled && <p>{WITHDRAWAL_RESTRICTION}</p>}
      {hasSearch ? (
        <AdminListState error={reviews.error} pending={reviews.isPending} onRetry={() => void reviews.refetch()} />
      ) : (
        <p className={emptyClass}>제목이나 작성자 이름으로 리뷰를 찾아보세요.</p>
      )}
      {reviews.isSuccess && (
        <>
          {reviews.data.content.length === 0 && <p className={emptyClass}>조회된 리뷰가 없습니다.</p>}
          <ul className='space-y-3' aria-busy={reviews.isPlaceholderData}>
            {reviews.data.content.map((review) => (
              <li key={review.id} className={`${rowClass} flex flex-wrap items-center justify-between gap-3`}>
                <div className='min-w-0'>
                  <Link href={`/reviews/${review.id}`} className='font-semibold wrap-anywhere hover:text-[#23745b] hover:underline focus-visible:outline-2 focus-visible:outline-[#23745b]'>{review.title}</Link>
                  <p className='mt-1 text-sm wrap-anywhere text-stone-600'>{review.author.nickname} · {review.category.category}</p>
                </div>
                <div className='flex gap-2'>
                  <button type='button' className={actionClass} disabled={reviews.isPlaceholderData} onClick={() => onViewReports(review.id)}>신고 보기</button>
                  <button
                    type='button'
                    className={`${actionClass} text-rose-700`}
                    disabled={isDeletionBlocked || isDeleting || reviews.isPlaceholderData}
                    aria-haspopup='dialog'
                    onClick={() => askToDelete(review)}
                  >삭제</button>
                </div>
              </li>
            ))}
          </ul>
          <AdminPagination label='리뷰 검색 결과 페이지' page={page} pageCount={reviews.data.totalPages} onPageChange={setPage} />
          {page > Math.max(1, reviews.data.totalPages) && (
            <button type='button' className={actionClass} onClick={() => setPage(Math.max(1, reviews.data.totalPages))}>
              마지막 페이지로 이동
            </button>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        aria-labelledby='admin-delete-title'
        className='m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-800 shadow-xl backdrop:bg-stone-900/40'
        onCancel={preventDeleteDismiss}
      >
        <h2 id='admin-delete-title' className='text-lg font-semibold'>리뷰 삭제</h2>
        <p className='mt-3 wrap-break-word'>‘{target?.title}’ 리뷰를 삭제하면 연결된 신고도 함께 삭제됩니다.</p>
        {error && <p role='alert' className='mt-3 text-rose-700'>{error}</p>}
        <div className='mt-5 flex justify-end gap-2'>
          <button type='button' className={actionClass} disabled={isDeleting} onClick={cancelDelete}>취소</button>
          <button
            type='button'
            className='rounded-lg bg-rose-700 px-4 py-2 text-white disabled:opacity-50'
            disabled={isDeletionBlocked || isDeleting}
            onClick={() => void confirmDelete()}
          >{isDeleting ? '삭제 중' : '삭제 확인'}</button>
        </div>
      </dialog>
    </section>
  );
};

export default AdminReviews;
