'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ReviewType } from '../../../_types/review';
import { getReviewImageUrl } from '../lib/review-image';
import CategoryLabel from './category-label';
import ReviewHelpfulCount from './review-helpful-count';

type ReviewCardProps = {
  review: ReviewType;
  imageSrc?: string;
  actions?: ReactNode;
};

const ReviewCard = ({ review, imageSrc, actions }: ReviewCardProps) => (
  <article className='group grid gap-4 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6'>
    <Link
      href={`/reviews/${review.id}`}
      aria-label={`${review.title} 리뷰 읽기`}
      className='relative grid aspect-4/3 place-items-center overflow-hidden rounded-2xl bg-stone-100 text-xs text-stone-400 outline-emerald-700 sm:self-start'
    >
      <Image
        src={
          imageSrc ||
          getReviewImageUrl(review.mainImageKey) ||
          '/reviews/no-image.svg'
        }
        alt={
          imageSrc || review.mainImageKey
            ? `${review.title} 대표 이미지`
            : '대표 이미지 없음'
        }
        fill
        unoptimized
        sizes='(max-width: 640px) 100vw, 180px'
        className='object-scale-down'
      />
    </Link>
    <div className='flex min-w-0 flex-col'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-[11px] text-stone-400'>
          <Link
            href={`/reviews?categoryId=${review.category.id}&page=1`}
            aria-label={`${review.category.category} 카테고리 리뷰 보기`}
            className='mr-2 -ml-2 inline-flex rounded-md px-2 py-1 font-medium text-[#458269] transition-colors hover:text-[#185b46] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
          >
            <CategoryLabel category={review.category.category} />
          </Link>
        </p>
        <div className='flex shrink-0 flex-wrap items-center justify-end gap-3'>
          {actions}
          <span
            aria-label={`5점 만점에 ${review.rating}점`}
            className='shrink-0 text-sm font-semibold text-stone-800 tabular-nums'
          >
            <span aria-hidden='true' className='mr-1 text-[#d7a459]'>
              ★
            </span>
            {review.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <h3 className='mt-2 line-clamp-2 text-lg leading-7 font-semibold tracking-tight break-words text-stone-900'>
        <Link
          href={`/reviews/${review.id}`}
          className='rounded-sm outline-emerald-700 transition-colors hover:text-[#23745b]'
        >
          {review.title}
        </Link>
      </h3>
      <div className='mt-auto pt-4'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3'>
          <div className='flex min-w-0 items-center gap-2.5 text-xs text-stone-600'>
            <Image
              key={review.author.profileImage}
              src={
                getReviewImageUrl(review.author.profileImage) ||
                '/default-profile.svg'
              }
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
            <div className='min-w-0'>
              <Link
                href={`/reviews?searchType=author&query=${encodeURIComponent(review.author.nickname)}&page=1`}
                aria-label={`${review.author.nickname} 작성자의 리뷰 보기`}
                className='block truncate rounded-sm font-medium transition-colors hover:text-[#185b46] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
              >
                {review.author.nickname}
              </Link>
              <time
                dateTime={review.createdAt}
                className='mt-0.5 block text-[11px] text-stone-400 tabular-nums'
              >
                <span className='sr-only'>작성일 </span>
                {review.createdAt.slice(0, 10).replaceAll('-', '.')}
              </time>
            </div>
          </div>

          <div className='ml-auto flex shrink-0 items-center gap-3 text-[11px] text-stone-400 tabular-nums'>
            <span className='inline-flex items-center gap-1.5'>
              <svg
                aria-hidden='true'
                viewBox='0 0 20 20'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.3'
                className='size-3.5 text-stone-400'
              >
                <path d='M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z' />
                <circle cx='10' cy='10' r='2' />
              </svg>
              <span className='sr-only'>조회수 </span>
              {review.viewCount.toLocaleString('ko-KR')}
            </span>
            <ReviewHelpfulCount
              isLike={review.isLike}
              count={review.likeCount}
            />
          </div>
        </div>
      </div>
    </div>
  </article>
);

export default ReviewCard;
