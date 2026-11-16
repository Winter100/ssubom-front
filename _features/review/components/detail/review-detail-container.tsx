'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDetailReview } from '../../hooks/use-review';
import { richTextClasses } from '../../lib/editor-config';
import { getReviewImageUrl } from '../../lib/review-image';
import ReviewBody from './review-body';
import CategoryLabel from '../category-label';
import ReviewComments from './review-comments';
import ReviewHelpful from './review-helpful';

const ReviewDetailContainer = ({ id }: { id: string }) => {
  const { data: review } = useDetailReview(id);

  return (
    <>
      <div className='grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_260px]'>
        <article className='min-w-0'>
          <header className='mb-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
            <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
              01 · THE BASICS
            </p>
            <div className='mt-5'>
              <h1 className='mt-4 max-w-3xl text-2xl leading-snug font-bold tracking-tight wrap-break-word sm:text-4xl'>
                {review.title}
              </h1>
              <p className='mt-3 text-sm wrap-break-word text-stone-500'>
                <span className='mr-2 text-stone-400'>상품명</span>
                {review.product}
              </p>
              <div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-400'>
                <div className='mr-auto inline-flex items-center gap-2 text-xs text-stone-600'>
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
                  <Link
                    href={`/reviews?searchType=author&query=${encodeURIComponent(review.author.nickname)}&page=1`}
                    aria-label={`${review.author.nickname} 작성자의 리뷰 보기`}
                    className='rounded-sm break-all hover:text-[#23745b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
                  >
                    {review.author.nickname}
                  </Link>

                  <span aria-hidden='true' className='h-3 w-px bg-stone-200' />

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
                </div>
                <div className='flex items-center gap-3 whitespace-nowrap text-[11px] text-stone-500 tabular-nums'>
                  <time
                    dateTime={review.createdAt}
                    className='inline-flex items-center gap-1.5'
                  >
                    <svg
                      aria-hidden='true'
                      viewBox='0 0 20 20'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.3'
                      strokeLinecap='round'
                      className='size-3.5 text-stone-400'
                    >
                      <rect x='3.5' y='4.5' width='13' height='12' rx='2' />
                      <path d='M6.5 3v3M13.5 3v3M3.5 8.5h13' />
                    </svg>
                    <span className='sr-only'>작성일 </span>
                    {review.createdAt.slice(0, 10).replaceAll('-', '.')}
                  </time>
                </div>
              </div>
            </div>
          </header>
          <section
            aria-label='대표 이미지'
            className='rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'
          >
            <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
              02 · THE FIRST IMPRESSION
            </p>
            <h2 className='mt-2 text-lg font-semibold'>대표 이미지</h2>
            <div className='mt-5'>
              <div className='relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-dashed border-[#bdccba] bg-[#f3f6ef]'>
                <Image
                  src={
                    getReviewImageUrl(review.mainImageKey) ||
                    '/reviews/no-image.svg'
                  }
                  alt={
                    review.mainImageKey
                      ? `${review.product} 대표 이미지`
                      : '대표 이미지 없음'
                  }
                  fill
                  unoptimized
                  sizes='(max-width: 1024px) 100vw, 700px'
                  className='object-scale-down'
                />
              </div>
            </div>
          </section>
          <section
            id='review-story'
            className='my-8 scroll-mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'
          >
            <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
              03 · YOUR HONEST STORY
            </p>
            <h2 className='mt-2 text-lg font-semibold'>진짜 써본 이야기</h2>
            <div
              className={`mt-5 rounded-2xl border border-transparent px-5 py-4 sm:px-7 ${richTextClasses} [&_p]:leading-2 [&_p]:whitespace-pre-wrap [&_p:empty]:min-h-lh`}
            >
              <ReviewBody content={review.content} />
            </div>
          </section>
          <div
            id='review-points'
            className='mt-10 grid scroll-mt-8 gap-4 sm:grid-cols-2'
          >
            {[
              {
                title: '＋ 이런 점이 좋았어요',
                items: review.pros,
                emptyMessage: '등록된 장점이 없습니다.',
                style: 'bg-[#edf3ec] text-[#36765d]',
                itemStyle: 'border-[#d7e4d4] text-[#405b49]',
              },
              {
                title: '− 이런 점은 아쉬웠어요',
                items: review.cons,
                emptyMessage: '등록된 단점이 없습니다.',
                style: 'bg-[#f1eee6] text-[#8f7953]',
                itemStyle: 'border-[#e3dac9] text-[#68583e]',
              },
            ].map(({ title, items, emptyMessage, style, itemStyle }) => {
              const points = items?.filter((item) => item.trim()) ?? [];

              return (
                <section
                  key={title}
                  className={`rounded-2xl p-5 sm:p-6 ${style}`}
                >
                  <h2 className='text-sm font-semibold'>{title}</h2>
                  <ul className='mt-4 space-y-3 text-xs leading-6'>
                    {points.length > 0 ? (
                      points.map((item, index) => (
                        <li
                          key={index}
                          className={`rounded-xl border bg-white/40 px-3.5 py-3 whitespace-pre-wrap wrap-break-word ${itemStyle}`}
                        >
                          - {item}
                        </li>
                      ))
                    ) : (
                      <li
                        className={`rounded-xl border border-dashed bg-white/20 px-3.5 py-3 ${itemStyle}`}
                      >
                        {emptyMessage}
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
          <section
            id='review-verdict'
            className='my-10 scroll-mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'
          >
            <p className='text-[10px] font-semibold tracking-widest text-[#8b9a80]'>
              MY FINAL THOUGHTS
            </p>
            <h2 className='mt-3 text-lg font-semibold'>이런 분께 추천해요</h2>
            <p className='mt-3 min-h-40 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-7 whitespace-pre-wrap wrap-break-word text-stone-600'>
              {review.verdict?.trim() || '등록된 추천 내용이 없습니다.'}
            </p>
          </section>
          <ReviewComments reviewId={id} />
        </article>
        <aside className='space-y-5 lg:sticky lg:top-8'>
          <section className='rounded-2xl border border-stone-200 bg-white p-6'>
            <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
              REVIEW AT A GLANCE
            </p>
            <h2 className='mt-3 text-lg font-semibold'>리뷰 요약</h2>
            <dl className='mt-5 space-y-4 text-xs'>
              <div className='flex justify-between gap-4'>
                <dt className='shrink-0 text-stone-400'>상품명</dt>
                <dd className='min-w-0 wrap-break-word'>{review.product}</dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='shrink-0 text-stone-400'>사용 기간</dt>
                <dd className='whitespace-pre-wrap wrap-break-word'>
                  {review.duration?.trim() || '등록된 사용 기간이 없습니다.'}
                </dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='shrink-0 text-stone-400'>카테고리</dt>
                <dd>
                  <Link
                    href={`/reviews?categoryId=${review.category.id}&page=1`}
                    aria-label={`${review.category.category} 카테고리 리뷰 보기`}
                    className='rounded-sm hover:text-[#23745b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'
                  >
                    <CategoryLabel category={review.category.category} />
                  </Link>
                </dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='shrink-0 text-stone-400'>작성자 평점</dt>
                <dd className='text-[#d7a459]'>
                  ★ {review.rating.toFixed(1)} / 5
                </dd>
              </div>
            </dl>
            <ReviewHelpful
              reviewId={id}
              isLike={review.isLike}
              countLike={review.likeCount}
            />
          </section>
          <nav
            aria-label='리뷰 바로가기'
            className='rounded-2xl border border-[#dfe8df] bg-[#edf3ec] p-6'
          >
            <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
              EXPLORE THIS REVIEW
            </p>
            <h2 className='mt-3 text-lg font-semibold'>
              궁금한 내용부터 읽어보세요
            </h2>
            <ul className='mt-5 space-y-2'>
              {[
                { href: '#review-story', label: '직접 써본 이야기' },
                { href: '#review-points', label: '좋았던 점과 아쉬운 점' },
                { href: '#review-verdict', label: '이런 분께 추천해요' },
                {
                  href: '#review-comments',
                  label: '댓글과 함께 나누는 이야기',
                },
              ].map(({ href, label }, index) => (
                <li key={href}>
                  <a
                    href={href}
                    className='flex items-center gap-3 rounded-xl px-3 py-3 text-xs text-[#405b49] transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#36765d]'
                  >
                    <span
                      aria-hidden='true'
                      className='text-[10px] text-[#637b69]'
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {label}
                    <span aria-hidden='true' className='ml-auto'>
                      ↓
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
};

export default ReviewDetailContainer;
