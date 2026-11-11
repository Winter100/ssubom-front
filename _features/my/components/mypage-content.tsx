'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMe } from '@/_features/auth/hooks/use-auth';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import MyReviewsFeed from './my-reviews-feed';
import MyReviewCounts from './my-review-counts';
import ProfileImageForm from './profile-image-form';
import Link from 'next/link';
import ReviewGridSkeleton from '@/_features/review/components/list/review-grid-skeleton';

const MyPageContent = () => {
  const { data: user, error, isPending, isFetching } = useMe();
  const router = useRouter();
  const [filters, setFilters] = useState<{ page: number; categoryId?: number }>({
    page: 1,
  });
  const resetReviewFilter = (): void => setFilters({ page: 1 });

  useEffect(() => {
    if (!isPending && !error && user === null)
      router.replace('/login');
  }, [isPending, error, user, router]);

  const message = error
    ? getAuthErrorMessage(
        error,
        '내 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.',
      )
    : '';

  if (isPending || !user) {
    return (
      <main className='mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-10 sm:py-14'>
        {message ? (
          <div role='alert' className='text-sm leading-6 text-red-700'>
            <p>{message}</p>
            <Link href='/login' className='mt-3 inline-block underline underline-offset-4'>
              로그인 페이지로 이동
            </Link>
          </div>
        ) : (
          <p role='status' className='text-sm text-stone-500'>
            {!isPending && user === null
              ? '로그인 페이지로 이동하고 있습니다…'
              : '로그인 상태를 확인하고 있습니다…'}
          </p>
        )}
      </main>
    );
  }

  return (
    <main className='mx-auto w-full max-w-6xl flex-1 px-5 py-10 text-stone-800 sm:px-10 sm:py-14'>
      <section
        aria-labelledby='mypage-title'
        className='overflow-hidden rounded-3xl border border-[#dfe8df] bg-white'
      >
        <div className='border-b border-[#dfe8df] bg-[#edf3ec] px-5 py-4 sm:px-6 sm:py-5'>
          <p className='mb-1 text-[10px] font-bold tracking-[0.18em] text-[#50755c]'>
            MY SPACE
          </p>
          <h1
            id='mypage-title'
            className='text-xl font-semibold tracking-tight'
          >
            마이페이지
          </h1>
          <p className='mt-1 text-xs leading-5 text-[#677668]'>
            써봄 속 나의 공간, 내 계정 정보를 확인해 보세요.
          </p>
        </div>
        <div className='p-4 sm:p-6'>
          {user && (
            <div className='grid min-w-0 items-start gap-5 lg:grid-cols-2'>
              <div className='min-w-0'>
                <h2 className='text-sm font-semibold text-stone-800'>
                  계정 정보
                </h2>
                <ProfileImageForm
                  key={user.id}
                  memberId={user.id}
                  nickname={user.nickname}
                  nicknameChangedAt={user.nicknameChangedAt}
                  profileImage={user.profileImage}
                />
                <dl className='mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200/80 px-3'>
                  <div className='grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-3 py-2.5'>
                    <dt className='text-xs font-medium text-stone-500'>
                      이메일
                    </dt>
                    <dd className='min-w-0 break-all text-xs leading-5 text-stone-700'>
                      {user.email}
                    </dd>
                  </div>
                  <div className='grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-3 py-2.5'>
                    <dt className='text-xs font-medium text-stone-500'>
                      가입일
                    </dt>
                    <dd className='min-w-0 break-all text-xs leading-5 text-stone-700'>
                      {new Date(user.createdAt).toLocaleString('ko-KR')}
                    </dd>
                  </div>
                </dl>
                {isFetching && (
                  <p
                    role='status'
                    className='mt-4 text-xs leading-5 text-stone-500'
                  >
                    최신 정보를 확인하고 있습니다…
                  </p>
                )}
              </div>
              <MyReviewCounts
                categoryId={filters.categoryId}
                onCategoryChange={(categoryId) => setFilters({ page: 1, categoryId })}
                onReset={resetReviewFilter}
              />
            </div>
          )}
        </div>
      </section>
      {user && (
        <ReviewsQueryBoundary fallback={<ReviewGridSkeleton count={15} />}>
          <MyReviewsFeed
            page={filters.page}
            categoryId={filters.categoryId}
            onPageChange={(page) => setFilters((previous) => ({ ...previous, page }))}
            onReset={resetReviewFilter}
          />
        </ReviewsQueryBoundary>
      )}
    </main>
  );
};

export default MyPageContent;
