'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from '@/_features/auth/hooks/use-auth';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import ReviewsQueryBoundary from '@/_features/review/components/reviews-query-boundary';
import MyReviewsFeed from './my-reviews-feed';

const MyPageContent = () => {
  const { data: user, error, isPending, isFetching } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !error && user === null) router.replace('/login');
  }, [isPending, error, user, router]);

  const message = error
    ? getAuthErrorMessage(
        error,
        '내 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.',
      )
    : '';

  return (
    <main className='mx-auto w-full max-w-4xl flex-1 px-5 py-10 text-stone-800 sm:px-10 sm:py-14'>
      <section
        aria-labelledby='mypage-title'
        className='overflow-hidden rounded-3xl border border-[#dfe8df] bg-white'
      >
        <div className='border-b border-[#dfe8df] bg-[#edf3ec] px-6 py-8 sm:px-9 sm:py-10'>
          <p className='mb-3 text-[11px] font-bold tracking-[0.18em] text-[#50755c]'>
            MY SPACE
          </p>
          <h1
            id='mypage-title'
            className='text-2xl font-semibold tracking-tight sm:text-3xl'
          >
            마이페이지
          </h1>
          <p className='mt-3 text-sm leading-6 text-[#677668]'>
            써봄 속 나의 공간, 내 계정 정보를 확인해 보세요.
          </p>
        </div>
        <div className='p-6 sm:p-9'>
          {isPending && (
            <p
              role='status'
              className='rounded-2xl bg-stone-50 px-5 py-6 text-sm leading-6 text-stone-500'
            >
              로그인 상태를 확인하고 있습니다…
            </p>
          )}
          {!isPending && !error && user === null && (
            <p
              role='status'
              className='rounded-2xl bg-stone-50 px-5 py-6 text-sm leading-6 text-stone-500'
            >
              로그인 페이지로 이동하고 있습니다…
            </p>
          )}
          {message && (
            <div
              role='alert'
              className='rounded-2xl border border-red-100 bg-red-50 p-5 text-sm leading-6 text-red-700'
            >
              <p>{message}</p>
              {error && (
                <Link
                  href='/login'
                  className='mt-3 inline-block rounded-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700'
                >
                  로그인 페이지로 이동
                </Link>
              )}
            </div>
          )}
          {user && (
            <>
              <h2 className='text-sm font-semibold text-stone-800'>
                계정 정보
              </h2>
              <dl className='mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200/80 px-5 sm:px-6'>
                <div className='grid gap-2 py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline sm:gap-4'>
                  <dt className='text-xs font-medium text-stone-500'>닉네임</dt>
                  <dd className='min-w-0 break-all text-base font-semibold text-[#23745b]'>
                    {user.nickname}
                  </dd>
                </div>
                <div className='grid gap-2 py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline sm:gap-4'>
                  <dt className='text-xs font-medium text-stone-500'>이메일</dt>
                  <dd className='min-w-0 break-all text-sm leading-6 text-stone-700'>
                    {user.email}
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
            </>
          )}
        </div>
      </section>
      {user && (
        <ReviewsQueryBoundary skeletonCount={3}>
          <MyReviewsFeed />
        </ReviewsQueryBoundary>
      )}
    </main>
  );
};

export default MyPageContent;
