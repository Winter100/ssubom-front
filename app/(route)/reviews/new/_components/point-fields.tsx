'use client';

const PointFields = ({
  label,
  items,
  onChange,
  tone,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  tone: 'green' | 'sand';
}) => (
  <section
    className={`rounded-2xl p-5 sm:p-6 ${tone === 'green' ? 'bg-[#edf3ec]' : 'bg-[#f1eee6]'}`}
  >
    <h2
      className={`text-sm font-semibold ${tone === 'green' ? 'text-[#36765d]' : 'text-[#8f7953]'}`}
    >
      {tone === 'green' ? '＋' : '−'} {label}
    </h2>
    <div className='mt-4 space-y-3'>
      {items.map((item, index) => (
        <div key={index} className='flex items-center gap-2'>
          <label className='min-w-0 flex-1'>
            <span className='sr-only'>
              {label} {index + 1}
            </span>
            <input
              value={item}
              maxLength={200}
              onChange={(event) =>
                onChange(
                  items.map((value, itemIndex) =>
                    itemIndex === index ? event.target.value : value,
                  ),
                )
              }
              placeholder='한 가지씩 간단하게 적어주세요'
              className='w-full rounded-lg border border-white bg-white/80 px-3 py-3 text-xs outline-emerald-700'
            />
          </label>
          <button
            type='button'
            aria-label={`${label} ${index + 1} 삭제`}
            onClick={() =>
              onChange(items.filter((_, itemIndex) => itemIndex !== index))
            }
            className='size-8 shrink-0 cursor-pointer rounded-lg text-stone-400 hover:bg-white/70 hover:text-stone-700'
          >
            ×
          </button>
        </div>
      ))}
    </div>
    <button
      type='button'
      disabled={items.length >= 10}
      onClick={() => onChange([...items, ''])}
      className='mt-4 cursor-pointer text-xs font-medium text-stone-600 disabled:cursor-default disabled:opacity-40'
    >
      ＋ 항목 추가{' '}
      <span className='text-[10px] font-normal text-stone-400'>
        {items.length}/10
      </span>
    </button>
  </section>
);

export default PointFields;
