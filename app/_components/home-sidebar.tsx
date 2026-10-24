const HomeSidebar = () => (
  <aside className='space-y-6 lg:pt-1'>
    <section className='rounded-2xl border border-stone-200/80 bg-white p-6'>
      <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
        OUR LITTLE PROMISE
      </p>
      <h2 className='mt-4 text-xl leading-relaxed font-semibold tracking-tight'>
        스펙보다 궁금한 건,
        <br />
        진짜 써본 느낌.
      </h2>
      <p className='mt-3 text-xs leading-6 text-stone-500'>
        누군가의 솔직한 경험이
        <br />
        당신의 선택에 도움이 되도록.
      </p>
      <div className='my-5 h-px bg-stone-100' />
      <ul className='space-y-4 text-xs text-stone-600'>
        <li>
          <span aria-hidden='true' className='mr-3 text-[#458269]'>
            ✓
          </span>
          직접 사용해 본 경험
        </li>
        <li>
          <span aria-hidden='true' className='mr-3 text-[#458269]'>
            ✓
          </span>
          좋은 점과 아쉬운 점을 함께
        </li>
        <li>
          <span aria-hidden='true' className='mr-3 text-[#458269]'>
            ✓
          </span>
          서로 다른 취향을 존중하는 리뷰
        </li>
      </ul>
    </section>
    <section className='relative overflow-hidden rounded-2xl bg-[#f0eee5] p-6'>
      <span
        aria-hidden='true'
        className='absolute -right-2 -bottom-9 font-serif text-[150px] text-[#dedfcd]'
      >
        “
      </span>
      <p className='text-[10px] font-semibold tracking-[0.14em] text-[#92947a]'>
        A NOTE TO REMEMBER
      </p>
      <p className='relative mt-5 font-serif text-lg leading-8 tracking-tight text-[#646c50]'>
        누군가에겐 평범한 경험이,
        <br />
        누군가에겐 꼭 필요한
        <br />
        이야기가 됩니다.
      </p>
      <p className='mt-6 text-[10px] text-[#92947a]'>
        당신의 일상에도 좋은 발견이 있기를.
      </p>
    </section>
  </aside>
);

export default HomeSidebar;
