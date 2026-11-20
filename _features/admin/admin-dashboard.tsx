'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/_features/auth/hooks/use-auth';
import AdminReports from './admin-reports';
import AdminReviews from './admin-reviews';
import AdminReportTypes from './admin-report-types';
import AdminCategories from './admin-categories';

const sections = [
  { id: 'reports', label: '신고 목록' },
  { id: 'reviews', label: '리뷰 관리' },
  { id: 'types', label: '신고 사유 관리' },
  { id: 'categories', label: '카테고리 관리' },
] as const;

const AdminBlankScreen = () => (
  <div
    aria-hidden='true'
    data-admin-gated=''
    className='fixed inset-0 z-[1000] bg-background'
  />
);

const AdminDashboard = () => {
  const router = useRouter();
  const { data: user, isPending, isError, isFetching } = useMe();
  const checking = isPending || isFetching;
  const admin = !isError && user?.role === 'ADMIN' ? user : null;

  useEffect(() => {
    if (!checking && !admin) router.replace('/reviews');
  }, [admin, checking, router]);

  if (!admin) return <AdminBlankScreen />;

  return (
    <>
      {checking && <AdminBlankScreen />}
      <div
        hidden={checking}
        className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'
      >
        <main className='mx-auto w-full max-w-6xl px-5 py-10 sm:px-10 sm:py-14'>
          <h1 className='text-3xl font-bold tracking-tight'>리뷰 관리자</h1>
          <div className='mt-8 overflow-hidden rounded-3xl border border-[#dfe8df] bg-white'>
            <AdminSections key={admin.id} memberId={admin.id} />
          </div>
        </main>
      </div>
    </>
  );
};

const AdminSections = ({ memberId }: { memberId: number }) => {
  const [section, setSection] =
    useState<(typeof sections)[number]['id']>('reports');
  const [reviewId, setReviewId] = useState<number>();

  return (
    <>
      <nav
        aria-label='관리 메뉴'
        className='flex flex-wrap gap-2 border-b border-[#dfe8df] bg-[#edf3ec] p-4 sm:px-6'
      >
        {sections.map(({ id, label }) => (
          <button
            key={id}
            type='button'
            aria-pressed={section === id}
            className='cursor-pointer rounded-full px-3 py-2 text-sm font-semibold text-[#405b49] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23745b] aria-pressed:bg-[#23745b] aria-pressed:text-white aria-pressed:hover:bg-[#185b46]'
            onClick={() => {
              if (id === 'reports' && section !== 'reports')
                setReviewId(undefined);
              setSection(id);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className='p-4 sm:p-6'>
        {section === 'reports' && (
          <AdminReports memberId={memberId} initialReviewId={reviewId} />
        )}
        {section === 'reviews' && (
          <AdminReviews
            memberId={memberId}
            onViewReports={(id) => {
              setReviewId(id);
              setSection('reports');
            }}
          />
        )}
        {section === 'types' && <AdminReportTypes memberId={memberId} />}
        {section === 'categories' && <AdminCategories memberId={memberId} />}
      </div>
    </>
  );
};

export default AdminDashboard;
