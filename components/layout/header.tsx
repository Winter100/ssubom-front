import Link from 'next/link';

/**
 * Todo
 * a태그 -> Link 태그
 * 프로젝트 명 적기
 */
const Header = () => {
  return (
    <header className='border-b border-stone-200/70 bg-white'>
      <div className='mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:gap-6 sm:px-10'>
        <a
          href='#'
          aria-label='써봄 홈'
          className='flex items-center gap-2.5 text-2xl font-extrabold tracking-tighter'
        >
          <span
            aria-hidden='true'
            className='grid size-9 place-items-center rounded-xl bg-[#23745b] text-xl font-medium text-white'
          >
            s.
          </span>
          써봄
          <span className='ml-1 hidden text-xs font-normal tracking-normal text-stone-400 sm:inline'>
            경험이 쌓이는 곳
          </span>
        </a>
        <nav
          aria-label='메인 메뉴'
          className='flex items-center gap-3 text-xs sm:gap-6 sm:text-sm'
        >
          <Link
            href='/reviews/new'
            className='rounded-full bg-[#23745b] px-4 py-2 text-xs font-medium text-white hover:bg-[#185b46]'
          >
            리뷰 쓰기 ＋
          </Link>
          <a
            href='#reviews'
            className='font-semibold text-[#23745b] transition-colors hover:text-emerald-900'
          >
            리뷰 둘러보기
          </a>
          <a
            href='#about'
            className='hidden text-stone-500 transition-colors hover:text-stone-900 sm:inline'
          >
            써봄 이야기 ↗
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
