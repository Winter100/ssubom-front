type ReviewPaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export const getPaginationItems = (
  page: number,
  pageCount: number,
): (number | `gap-${number}`)[] => {
  if (pageCount < 1) return [];
  const pages = new Set([1, pageCount]);
  for (
    let current = Math.max(1, page - 2);
    current <= Math.min(pageCount, page + 2);
    current++
  ) {
    pages.add(current);
  }
  const items: (number | `gap-${number}`)[] = [];
  const sortedPages = [...pages].sort((a, b) => a - b);
  sortedPages.forEach((current, index) => {
    const previous = sortedPages[index - 1];
    if (previous !== undefined && current - previous > 1) {
      items.push(`gap-${previous}`);
    }
    items.push(current);
  });
  return items;
};

const ReviewPagination = ({
  page,
  pageCount,
  onPageChange,
}: ReviewPaginationProps) => (
  <nav
    aria-label='리뷰 페이지 이동'
    className='mt-6 flex flex-wrap items-center justify-center gap-1 sm:gap-2'
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
    {getPaginationItems(page, pageCount).map((pageNumber) =>
      typeof pageNumber === 'number' ? (
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
      ) : (
        <span key={pageNumber} aria-hidden='true' className='px-1 text-xs text-stone-400'>
          …
        </span>
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
