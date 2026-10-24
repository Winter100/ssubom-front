import React from 'react';

const Footer = () => {
  return (
    <footer id='about' className='border-t border-stone-200 bg-white'>
      <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-10'>
        <div>
          <p className='text-lg font-bold tracking-tight'>
            써봄
            <span className='ml-3 text-xs font-normal text-stone-400'>
              써본 경험을 나누고, 더 나은 선택을 만듭니다.
            </span>
          </p>
        </div>
        <p className='text-[10px] tracking-wider text-stone-400'>
          SS EOBOM · EVERYDAY DISCOVERIES
        </p>
      </div>
    </footer>
  );
};

export default Footer;
