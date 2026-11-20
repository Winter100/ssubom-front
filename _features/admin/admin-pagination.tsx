type AdminPaginationProps = {
  label: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const arrowClass = 'grid size-9 cursor-pointer place-items-center rounded-full bg-white text-base text-[#405b49] transition-colors hover:bg-[#dfe8df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] disabled:cursor-default disabled:opacity-35';

const AdminPagination = ({ label, page, pageCount, onPageChange }: AdminPaginationProps) => {
  if (pageCount <= 1 || page > pageCount) return null;

  return (
    <nav aria-label={label} className='mt-5 flex justify-center'>
      <div className='inline-flex items-center gap-1 rounded-full border border-[#dfe8df] bg-[#edf3ec] p-1'>
        <button type='button' className={arrowClass} aria-label='이전 페이지' disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        <span aria-live='polite' className='inline-flex min-w-14 items-center justify-center gap-1 px-1.5 text-xs tabular-nums text-[#405b49]'>
          <strong className='rounded-full bg-[#23745b] px-2 py-1 text-white'>{page}</strong>
          <span aria-hidden='true'>/</span>
          <span className='sr-only'>페이지, 전체</span>
          <span>{pageCount}</span>
        </span>
        <button type='button' className={arrowClass} aria-label='다음 페이지' disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>›</button>
      </div>
    </nav>
  );
};

export default AdminPagination;
