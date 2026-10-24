const HomeHero = () => (
  <section
    aria-labelledby='hero-title'
    className='relative overflow-hidden rounded-3xl border border-[#dfe8df] bg-[#edf3ec] px-7 py-10 sm:px-12 sm:py-12'
  >
    <div className='relative z-10 max-w-xl'>
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
      className='absolute -right-12 top-0 hidden h-full w-105 items-center justify-center lg:flex'
    >
      <div className='absolute size-80 rounded-full border border-[#d3dfd0]' />
      <div className='absolute size-64 rounded-full border border-[#d3dfd0]' />
      <div className='absolute right-16 top-9 rotate-12 rounded-2xl bg-white/70 px-5 py-3 text-xs text-[#61735f] shadow-sm'>
        작은 발견이 모여
      </div>
      <div className='-rotate-12 rounded-2xl border border-white bg-white/85 p-6 shadow-xl shadow-[#567052]/10'>
        <span className='text-[10px] tracking-widest text-stone-400'>
          MY EVERYDAY FAVORITE
        </span>
        <div className='mt-3 flex items-center gap-4'>
          <span className='grid size-14 place-items-center rounded-full bg-[#e7eddf] text-3xl text-[#718568]'>
            ✳
          </span>
          <div>
            <p className='text-sm font-semibold'>직접 써보고 남기는</p>
            <p className='mt-1 font-serif text-2xl italic text-[#36765d]'>
              honest review.
            </p>
          </div>
        </div>
        <p className='mt-5 text-sm tracking-[5px] text-[#d7a459]'>★★★★★</p>
      </div>
      <div className='absolute right-20 bottom-10 -rotate-6 rounded-full bg-[#dbe6d5] px-4 py-2 text-xs text-[#61735f]'>
        더 나은 선택으로 🌱
      </div>
    </div>
  </section>
);

export default HomeHero;
