import Image from 'next/image';
import heroIcon from '@/public/h1.png';
import heroIllustration from '@/public/h2.png';

const HomeHero = () => (
  <section
    aria-labelledby='hero-title'
    className='relative overflow-hidden rounded-3xl border border-[#dfe8df] bg-[#edf3ec] px-7 py-10 sm:px-12 sm:py-12'
  >
    <div className='relative z-10 max-w-xl lg:max-w-[55%]'>
      <Image
        src={heroIcon}
        alt=''
        sizes='80px'
        className='mb-4 size-20 rounded-2xl lg:hidden'
      />
      <p className='mb-4 text-[11px] font-bold tracking-[0.22em] text-[#50755c]'>
        REAL PEOPLE. REAL EXPERIENCES.
      </p>
      <h1
        id='hero-title'
        className='text-3xl leading-snug font-semibold tracking-tight sm:text-[42px]'
      >
        써본 사람의 이야기,
        <br />
        다음 선택의 힌트가 되다.
      </h1>
      <p className='mt-5 text-sm leading-7 text-[#677668]'>
        좋았던 점도, 조금 아쉬웠던 점도.
        <br className='sm:hidden' /> 직접 사용한 경험을 만나보세요.
      </p>
      <a
        href='#reviews'
        className='mt-7 inline-flex items-center gap-6 rounded-full bg-[#23745b] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#185b46]'
      >
        나에게 맞는 리뷰 찾기 <span aria-hidden='true'>↗</span>
      </a>
    </div>
    <div
      aria-hidden='true'
      className='absolute right-4 top-0 hidden h-full w-[43%] items-center justify-center lg:flex'
    >
      <Image
        src={heroIllustration}
        alt=''
        sizes='(min-width: 1280px) 510px, 43vw'
        className='h-auto max-h-full w-full object-contain'
      />
    </div>
  </section>
);

export default HomeHero;
