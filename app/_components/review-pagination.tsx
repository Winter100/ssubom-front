type ReviewPaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const ReviewPagination = ({
  page,
  pageCount,
  onPageChange,
}: ReviewPaginationProps) => (
  <nav
    aria-label='리뷰 페이지 이동'
    className='mt-6 flex items-center justify-center gap-2'
  >
    <button
      type='button'
      aria-label='이전 페이지'
      disabled={page === 1}
      onClick={() => onPageChange(page - 1)}
      className='grid size-9 cursor-pointer place-items-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:cursor-default disabled:opacity-25'
    >
      ←
    </button>
    {Array.from({ length: pageCount }, (_, index) => index + 1).map(
      (pageNumber) => (
        <button
          type='button'
          key={pageNumber}
          aria-label={`${pageNumber}페이지`}
          aria-current={page === pageNumber ? 'page' : undefined}
          onClick={() => onPageChange(pageNumber)}
          className={`size-9 cursor-pointer rounded-lg text-xs font-medium transition-colors ${page === pageNumber ? 'bg-[#263d31] text-white' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          {pageNumber}
        </button>
      ),
    )}
    <button
      type='button'
      aria-label='다음 페이지'
      disabled={page === pageCount}
      onClick={() => onPageChange(page + 1)}
      className='grid size-9 cursor-pointer place-items-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:cursor-default disabled:opacity-25'
    >
      →
    </button>
  </nav>
);

export default ReviewPagination;
