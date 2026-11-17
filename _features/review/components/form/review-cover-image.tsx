'use client';

import Image from 'next/image';
import { useRef, type ChangeEvent } from 'react';

type ReviewCoverImageProps = {
  image: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

const ReviewCoverImage = ({
  image,
  disabled,
  onChange,
  onRemove,
}: ReviewCoverImageProps) => {
  const imageInput = useRef<HTMLInputElement>(null);

  return (
    <section className='rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
      <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
        02 · THE FIRST IMPRESSION
      </p>
      <h2 className='mt-2 text-lg font-semibold'>대표 이미지</h2>
      <div className='mt-5'>
        <div className='relative flex aspect-[16/9] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#bdccba] bg-[#f3f6ef] focus-within:ring-2 focus-within:ring-emerald-600'>
          {image ? (
            <>
              <Image
                src={image}
                alt='선택한 대표 이미지'
                fill
                unoptimized
                className='object-scale-down'
              />
            </>
          ) : (
            <>
              <span
                aria-hidden='true'
                className='text-3xl text-[#7a8e78]'
              >
                ＋
              </span>
              <span className='mt-3 text-sm text-[#61735f]'>
                직접 찍은 상품 사진을 올려주세요
              </span>
              <span className='mt-2 text-[10px] text-stone-400'>
                JPG, PNG, WebP · 최대 5MB
              </span>
            </>
          )}
          <button
            type='button'
            disabled={disabled}
            onClick={() => imageInput.current?.click()}
            className='absolute bottom-4 cursor-pointer rounded-full bg-white/90 px-4 py-2 text-xs focus-visible:outline-2 focus-visible:outline-[#23745b] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {image ? '이미지 변경' : '이미지 선택'}
          </button>
          <input
            ref={imageInput}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            aria-label='대표 이미지 선택'
            disabled={disabled}
            onChange={onChange}
            className='hidden'
          />
        </div>
        {image && (
          <button
            type='button'
            disabled={disabled}
            onClick={onRemove}
            className='mt-3 cursor-pointer text-xs text-stone-400 hover:text-red-700'
          >
            대표 이미지 삭제
          </button>
        )}
      </div>
    </section>
  );
};

export default ReviewCoverImage;
