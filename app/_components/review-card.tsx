import Image from 'next/image';
import Link from 'next/link';
import type { ReviewType } from '../_types/review';

type ReviewCardProps = {
  review: ReviewType;
  imageSrc?: string;
};

const ReviewCard = ({ review, imageSrc }: ReviewCardProps) => (
  <article className='group grid gap-5 py-7 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-6'>
    <Link
      href={`/reviews/${review.id}`}
      aria-label={`${review.title} 리뷰 읽기`}
      className='relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-stone-100 text-xs text-stone-400 outline-emerald-700 sm:self-start'
    >
      <Image
        src={imageSrc || '/reviews/no-image.svg'}
        alt={imageSrc ? `${review.title} 대표 이미지` : '대표 이미지 없음'}
        fill
        sizes='(max-width: 640px) 100vw, 190px'
        className='object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none'
      />
    </Link>
    <div className='flex min-w-0 flex-col py-1'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-[11px] text-stone-400'>
          <span className='mr-2 font-medium text-[#458269]'>
            {review.category.category}
          </span>
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
      <div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-stone-400'>
        <span className='mr-auto inline-flex items-center gap-2 text-xs text-stone-600'>
          <span
            aria-hidden='true'
            className='grid size-6 place-items-center rounded-full bg-[#e9eee5] text-[10px] text-[#66785a]'
          >
            {review.author.nickname.slice(0, 1)}
          </span>
          {review.author.nickname}
        </span>
        <time dateTime={review.createdAt}>
          {review.createdAt.slice(0, 10).replaceAll('-', '.')}
        </time>
      </div>
    </div>
  </article>
);

export default ReviewCard;
