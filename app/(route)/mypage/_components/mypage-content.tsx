'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/_features/login/components/auth-provider';
import { useCurrentUser } from '@/_hooks/use-current-user';
import { getAuthErrorMessage } from '@/_lib/auth-client';

const MyPageContent = () => {
  const { status, user, error: authError } = useAuth();
  const { error, isFetching } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  const message =
    status === 'error'
      ? authError
      : error
        ? getAuthErrorMessage(
            error,
            '내 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.',
          )
        : '';

  return (
    <main className='mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:py-20'>
      <section
        aria-labelledby='mypage-title'
        className='rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10'
      >
        <p className='mb-3 text-sm font-semibold text-[#23745b]'>
          써봄의 나의 공간
        </p>
        <h1 id='mypage-title' className='text-3xl font-bold tracking-tight'>
          마이페이지
        </h1>
        {status === 'loading' && (
          <p role='status' className='mt-6 text-sm text-stone-500'>
            로그인 상태를 확인하고 있습니다…
          </p>
        )}
        {status === 'anonymous' && (
          <p role='status' className='mt-6 text-sm text-stone-500'>
            로그인 페이지로 이동하고 있습니다…
          </p>
        )}
        {message && (
          <div
            role='alert'
            className='mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700'
          >
            <p>{message}</p>
            {status === 'error' && (
              <Link
                href='/login'
                className='mt-3 inline-block font-semibold underline underline-offset-4'
              >
                로그인 페이지로 이동
              </Link>
            )}
          </div>
        )}
        {status === 'authenticated' && user && (
          <>
            <p className='mt-3 text-sm text-stone-500'>
              내 계정 정보를 확인해 보세요.
            </p>
            <dl className='mt-8 divide-y divide-stone-100'>
              <div className='py-5'>
                <dt className='text-sm font-medium text-stone-500'>닉네임</dt>
                <dd className='mt-2 break-all text-lg font-semibold'>
                  {user.nickname}
                </dd>
              </div>
              <div className='py-5'>
                <dt className='text-sm font-medium text-stone-500'>이메일</dt>
                <dd className='mt-2 break-all text-base'>{user.email}</dd>
              </div>
            </dl>
            {isFetching && (
              <p role='status' className='mt-4 text-sm text-stone-500'>
                최신 정보를 확인하고 있습니다…
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default MyPageContent;
