'use client';

import { project } from '@/_constant/web';
import { useMe } from '@/_features/auth/hooks/use-auth';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
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
            className='inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#23745b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b] sm:text-xs'
          >
            <svg
              aria-hidden='true'
              viewBox='0 0 20 20'
              fill='none'
              className='size-3.5'
            >
              <rect
                x='3'
                y='3'
                width='5'
                height='5'
                rx='1'
                stroke='currentColor'
                strokeWidth='1.3'
              />
              <rect
                x='12'
                y='3'
                width='5'
                height='5'
                rx='1'
                stroke='currentColor'
                strokeWidth='1.3'
              />
              <rect
                x='3'
                y='12'
                width='5'
                height='5'
                rx='1'
                stroke='currentColor'
                strokeWidth='1.3'
              />
              <rect
                x='12'
                y='12'
                width='5'
                height='5'
                rx='1'
                stroke='currentColor'
                strokeWidth='1.3'
              />
            </svg>
            리뷰 둘러보기
          </Link>
          <HeaderAuthNavigation />
        </nav>
      </div>
      {/* <HeaderAuthError /> */}
    </header>
  );
};

export default Header;

const HeaderAuthNavigation = () => {
  const { data: user, isPending } = useMe();



  return isPending ? (
    <span role='status' className='px-4 py-2 text-stone-500'>
      {null}
    </span>
  ) : user ? (
    <details
      className='group relative'
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          event.currentTarget.open = false;
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary
        aria-label={`${user.nickname}님 메뉴`}
        title={user.nickname}
        className='flex min-w-0 cursor-pointer list-none items-center gap-1.5 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2 text-[11px] font-medium text-stone-700 transition-colors hover:border-[#23745b]/30 hover:bg-emerald-50/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#23745b] sm:text-xs [&::-webkit-details-marker]:hidden'
      >
        <Image
          key={user.profileImage}
          src={user.profileImage || '/default-profile.svg'}
          alt=''
          width={24}
          height={24}
          unoptimized
          onError={(event) => {
            event.currentTarget.srcset = '';
            event.currentTarget.src = '/default-profile.svg';
          }}
          className='size-6 shrink-0 rounded-full object-cover'
        />
        <span className='max-w-24 truncate sm:max-w-40'>{user.nickname}</span>
        <svg
          aria-hidden='true'
          viewBox='0 0 20 20'
          fill='none'
          className='size-3 text-stone-400 transition-transform group-open:rotate-180'
        >
          <path
            d='m6 8 4 4 4-4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </summary>
      <div
        className='absolute right-0 top-full z-50 mt-3 w-44 rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-lg shadow-stone-900/10'
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) {
            const dropdown = event.currentTarget.closest('details');
            if (dropdown) dropdown.open = false;
          }
        }}
      >
        <Link
          href='/mypage'
          className='block rounded-xl px-3 py-2.5 font-medium text-stone-700 transition-colors hover:bg-emerald-50 hover:text-[#23745b] focus-visible:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-[#23745b]'
        >
          마이페이지
        </Link>
        <Link
          href='/reviews/new'
          className='block rounded-xl px-3 py-2.5 font-medium text-stone-700 transition-colors hover:bg-emerald-50 hover:text-[#23745b] focus-visible:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-[#23745b]'
        >
          리뷰 쓰기
        </Link>
      </div>
    </details>
  ) : (
    <Link
      href='/login'
      className='rounded-full bg-[#23745b] px-4 py-2 text-xs font-medium text-white hover:bg-[#185b46]'
    >
      로그인
    </Link>
  );
};

const HeaderAuthError = () => {
  const { error } = useMe();

  return (
    error && (
      <p
        role='status'
        className='mx-auto max-w-7xl px-5 pb-3 text-xs text-stone-600 sm:px-10'
      >
        {error.message}
      </p>
    )
  );
};
