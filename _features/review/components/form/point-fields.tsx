'use client';

import { useRef } from 'react';

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
}) => {
  const pendingFocusIndex = useRef<number | null>(null);

  const addItem = (focusNewInput = false): void => {
    if (items.length >= 10) return;
    if (focusNewInput) pendingFocusIndex.current = items.length;
    onChange([...items, '']);
  };

  return (
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
                ref={(input) => {
                  if (input && pendingFocusIndex.current === index) {
                    input.focus();
                    pendingFocusIndex.current = null;
                  }
                }}
                value={item}
                maxLength={200}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (!event.repeat && item.trim()) addItem(true);
                }}
                onChange={(event) =>
                  onChange(
                    items.map((value, itemIndex) =>
                      itemIndex === index ? event.target.value : value,
                    ),
                  )
                }
                placeholder='한 가지씩 간단하게 적어주세요'
                className={`w-full rounded-xl border bg-white/40 px-3.5 py-3 text-sm leading-6 outline-offset-2 ${tone === 'green' ? 'border-[#d7e4d4] text-[#405b49] placeholder:text-[#637b69] outline-[#36765d]' : 'border-[#e3dac9] text-[#68583e] placeholder:text-[#827156] outline-[#8f7953]'}`}
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
        onClick={() => addItem()}
        className='mt-4 cursor-pointer text-xs font-medium text-stone-600 disabled:cursor-default disabled:opacity-40'
      >
        ＋ 항목 추가{' '}
        <span className='text-[10px] font-normal text-stone-400'>
          {items.length}/10
        </span>
      </button>
    </section>
  );
};

export default PointFields;
