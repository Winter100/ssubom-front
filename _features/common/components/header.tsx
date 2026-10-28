'use client';

import { project } from '@/_constant/web';
import { useAuth } from '@/_features/login/components/auth-provider';
import Link from 'next/link';

const Header = () => {
  const { status, user, error } = useAuth();
  return (
    <header className='border-b border-stone-200/70 bg-white'>
      <div className='mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:gap-6 sm:px-10'>
        <Link
          href='/'
          aria-label='써봄 홈'
          className='flex items-center gap-2.5 text-2xl font-extrabold tracking-tighter'
        >
          {project.title}
          <span className='ml-1 hidden text-xs font-normal tracking-normal text-stone-400 sm:inline'>
            {project.header_description}
          </span>
        </Link>
        <nav
          aria-label='메인 메뉴'
          className='flex max-w-full flex-wrap items-center gap-3 text-xs sm:gap-6 sm:text-sm'
        >
          <Link
            href='/reviews'
            className='font-medium text-[#23745b] hover:underline hover:underline-offset-4'
          >
            리뷰 둘러보기
          </Link>
          {/* {status === 'authenticated' && user && (
            <Link
              href='/mypage'
              aria-label={`${user.nickname}님 마이페이지로 이동`}
              title={user.nickname}
              className='max-w-24 truncate font-medium text-stone-600 hover:text-[#23745b] hover:underline sm:max-w-40'
            >
              {user.nickname}
            </Link>
          )} */}
          {/* {status === 'loading' ? (
            <span role='status' className='px-4 py-2 text-stone-500'>
              확인 중…
            </span>
          ) : (
            <Link
              href={status === 'authenticated' ? '/reviews/new' : '/login'}
              className='rounded-full bg-[#23745b] px-4 py-2 text-xs font-medium text-white hover:bg-[#185b46]'
            >
              {status === 'authenticated' ? '리뷰 쓰기 ＋' : '로그인'}
            </Link>
          )} */}
          <Link
            href={'/reviews/new'}
            className='rounded-full bg-[#23745b] px-4 py-2 text-xs font-medium text-white hover:bg-[#185b46]'
          >
            {'리뷰 쓰기 ＋'}
          </Link>
        </nav>
      </div>
      {/* {status === 'error' && (
        <p role='status' className='mx-auto max-w-7xl px-5 pb-3 text-xs text-stone-600 sm:px-10'>
          {error}
        </p>
      )} */}
    </header>
  );
};

export default Header;
