import Link from 'next/link';
import AdminPagination from './admin-pagination';
import { useAdminReports } from './hooks/use-admin-reports';
import {
  actionClass,
  AdminListState,
  emptyClass,
  filterClass,
  inputClass,
  primaryActionClass,
} from './admin-list-state';

const columns = [
  { label: '리뷰 제목', width: 'w-[24%]' },
  { label: '작성자', width: 'w-[11%]' },
  { label: '신고자', width: 'w-[11%]' },
  { label: '신고 사유', width: 'w-[14%]' },
  { label: '상세 내용', width: 'w-[25%]' },
  { label: '신고 시각', width: 'w-[15%]' },
] as const;

const seoulTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const AdminReports = ({
  memberId,
  initialReviewId,
}: {
  memberId: number;
  initialReviewId?: number;
}) => {
  const {
    reports,
    page,
    setPage,
    hasFilter,
    filter,
    setFilter,
    filterError,
    applyFilter,
    clearFilter,
  } = useAdminReports(memberId, initialReviewId);

  return (
    <section aria-label='신고 목록' className='space-y-4'>
      <form className={filterClass} onSubmit={applyFilter}>
        <label className='grid min-w-0 grow basis-40 gap-1 text-sm sm:grow-0'>
          리뷰 ID
          <input
            className={inputClass}
            inputMode='numeric'
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <button className={primaryActionClass}>필터 적용</button>
        {hasFilter && (
          <button type='button' className={actionClass} onClick={clearFilter}>
            전체 보기
          </button>
        )}
      </form>
      {filterError && <p role='alert'>{filterError}</p>}
      <AdminListState
        error={reports.error}
        pending={reports.isPending}
        onRetry={() => void reports.refetch()}
      />
      {reports.isSuccess && (
        <>
          {reports.data.content.length === 0 ? (
            <p className={emptyClass}>조회된 신고가 없습니다.</p>
          ) : (
            <div
              role='region'
              aria-label='리뷰 신고 내역 표'
              tabIndex={0}
              className='overflow-x-auto rounded-2xl border border-[#dfe8df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b]'
            >
              <table
                aria-label='리뷰 신고 내역'
                aria-busy={reports.isPlaceholderData}
                className='w-full min-w-[47rem] table-fixed text-left text-sm'
              >
                <thead className='border-b border-[#dfe8df] bg-[#edf3ec] text-xs text-[#405b49]'>
                  <tr>
                    {columns.map(({ label, width }) => (
                      <th
                        key={label}
                        scope='col'
                        className={`${width} px-3 py-3 font-semibold sm:px-4`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-stone-100 text-stone-600 [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_td]:wrap-anywhere sm:[&_td]:px-4'>
                  {reports.data.content.map((report) => (
                    <tr
                      key={report.id}
                      className='odd:bg-white even:bg-[#fafbf9] hover:bg-[#f3f6ef] focus-within:bg-[#f3f6ef]'
                    >
                      <td>
                        <Link
                          href={`/reviews/${report.reviewId}`}
                          className='font-semibold text-[#23745b] hover:underline focus-visible:outline-2 focus-visible:outline-[#23745b]'
                        >
                          {report.reviewTitle}
                        </Link>
                      </td>
                      <td>{report.author.nickname}</td>
                      <td>{report.reporter?.nickname ?? '탈퇴한 회원'}</td>
                      <td>{report.reportType.name}</td>
                      <td>
                        <ReportReason reason={report.reason} />
                      </td>
                      <td className='text-xs leading-5 tabular-nums'>
                        <time dateTime={report.createdAt}>
                          {seoulTime.format(new Date(report.createdAt))}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination
            label='신고 목록 페이지'
            page={page}
            pageCount={reports.data.totalPages}
            onPageChange={setPage}
          />
          {page > Math.max(1, reports.data.totalPages) && (
            <button
              type='button'
              className={actionClass}
              onClick={() => setPage(Math.max(1, reports.data.totalPages))}
            >
              마지막 페이지로 이동
            </button>
          )}
        </>
      )}
    </section>
  );
};

const ReportReason = ({ reason }: { reason: string }) => {
  const preview = reason.replace(/\s+/g, ' ').trim();
  if (preview.length <= 80 && !reason.includes('\n')) {
    return <p className='leading-5 whitespace-pre-wrap'>{reason}</p>;
  }

  return (
    <details className='group'>
      <summary className='cursor-pointer list-none leading-5 focus-visible:outline-2 focus-visible:outline-[#23745b] [&::-webkit-details-marker]:hidden'>
        <span className='line-clamp-2 group-open:hidden'>{preview}</span>
        <span className='text-xs font-semibold text-[#23745b] group-open:hidden'>
          펼쳐 보기
        </span>
        <span className='hidden text-xs font-semibold text-[#23745b] group-open:inline'>
          접기
        </span>
      </summary>
      <p className='mt-2 leading-5 whitespace-pre-wrap'>{reason}</p>
    </details>
  );
};

export default AdminReports;
