import Image from 'next/image';
import Link from 'next/link';
import type { Review } from '../_lib/reviews';

const numberFormatter = new Intl.NumberFormat('ko-KR');

const ReviewCard = ({ review }: { review: Review }) => (
  <article className='group grid gap-5 py-7 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-6'>
    <Link
      href={`/reviews/${review.id}`}
      aria-label={`${review.product} 리뷰 읽기`}
      className='relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100 outline-emerald-700 sm:self-start'
    >
      <Image
        src={review.image}
        alt={`${review.product} 대표 일러스트`}
        fill
        sizes='(max-width: 640px) 100vw, 190px'
        className='object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none'
      />
      <span className='absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-stone-600'>
        {review.duration}
      </span>
    </Link>
    <div className='flex min-w-0 flex-col py-1'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-[11px] text-stone-400'>
          <span className='mr-2 font-medium text-[#458269]'>
            {review.category}
          </span>
          <span aria-hidden='true'>/</span>
          <span className='ml-2'>{review.product}</span>
        </p>
        <span
          aria-label={`5점 만점에 ${review.rating}점`}
          className='shrink-0 text-sm font-bold'
        >
          <span aria-hidden='true' className='mr-1 text-[#d7a459]'>
            ★
          </span>
          {review.rating.toFixed(1)}
        </span>
      </div>
      <h3 className='mt-3 text-lg leading-relaxed font-semibold tracking-tight break-keep'>
        <Link
          href={`/reviews/${review.id}`}
          className='rounded-sm outline-emerald-700 transition-colors hover:text-[#23745b]'
        >
          {review.title}
        </Link>
      </h3>
      <p className='mt-2 line-clamp-2 text-xs leading-6 text-stone-500'>
        {review.excerpt}
      </p>
      <div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-stone-400'>
        <span className='mr-auto inline-flex items-center gap-2 text-xs text-stone-600'>
          <span
            aria-hidden='true'
            className='grid size-6 place-items-center rounded-full bg-[#e9eee5] text-[10px] text-[#66785a]'
          >
            {review.initial}
          </span>
          {review.author}
        </span>
        <time dateTime={review.date}>{review.date.replaceAll('-', '.')}</time>
        <span className='h-2.5 w-px bg-stone-200' aria-hidden='true' />
        <span>조회 {numberFormatter.format(review.views)}</span>
      </div>
    </div>
  </article>
);

export default ReviewCard;
