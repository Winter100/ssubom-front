'use client';

import { useState } from 'react';
import { reviews, type Category } from '../_lib/reviews';
import ReviewCard from './review-card';
import ReviewPagination from './review-pagination';

type Sort = 'latest' | 'rating' | 'views';

const categories: Category[] = ['전체', '디지털', '리빙', '패션', '뷰티'];
const PAGE_SIZE = 3;

const ReviewFeed = () => {
  const [category, setCategory] = useState<Category>('전체');
  const [query, setQuery] = useState<string>('');
  const [sort, setSort] = useState<Sort>('latest');
  const [page, setPage] = useState<number>(1);

  const search = query.trim().toLocaleLowerCase('ko-KR');
  const filteredReviews = reviews
    .filter(
      (review) =>
        (category === '전체' || review.category === category) &&
        `${review.title} ${review.product} ${review.author}`
          .toLocaleLowerCase('ko-KR')
          .includes(search),
    )
    .sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'views') return b.views - a.views;
      return b.date.localeCompare(a.date);
    });
  const pageCount = Math.ceil(filteredReviews.length / PAGE_SIZE);
  const visibleReviews = filteredReviews.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount) return;
    setPage(nextPage);
  };

  return (
    <section
      id='reviews'
      aria-labelledby='reviews-title'
      className='min-w-0 scroll-mt-6'
    >
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#7b8b7c]'>
            THE REVIEW FEED
          </p>
          <h2 id='reviews-title' className='text-2xl font-bold tracking-tight'>
            요즘, 써본 이야기
            <span className='ml-2 align-middle text-sm font-normal text-stone-400'>
              {reviews.length}
            </span>
          </h2>
        </div>
        <label className='relative w-full sm:w-60'>
          <span className='sr-only'>리뷰 검색</span>
          <span
            aria-hidden='true'
            className='absolute top-2.5 left-3 text-stone-400'
          >
            ⌕
          </span>
          <input
            type='search'
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder='상품, 제목, 작성자 검색'
            className='w-full rounded-xl border border-stone-200 bg-white py-2.5 pr-3 pl-9 text-xs outline-none transition focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100'
          />
        </label>
      </div>

      <div className='mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5'>
        <div aria-label='카테고리 필터' className='flex flex-wrap gap-2'>
          {categories.map((item) => (
            <button
              key={item}
              type='button'
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${category === item ? 'bg-[#263d31] text-white' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <label>
          <span className='sr-only'>리뷰 정렬</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as Sort);
              setPage(1);
            }}
            className='cursor-pointer rounded-lg bg-transparent px-2 py-2 text-xs text-stone-500 outline-emerald-700'
          >
            <option value='latest'>최신순</option>
            <option value='rating'>평점 높은 순</option>
            <option value='views'>조회순</option>
          </select>
        </label>
      </div>

      <div aria-live='polite' aria-atomic='true'>
        <p className='sr-only'>
          검색 결과 {filteredReviews.length}개, {pageCount === 0 ? 0 : page} /{' '}
          {pageCount} 페이지
        </p>
        <div className='divide-y divide-stone-200/70'>
          {visibleReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {visibleReviews.length === 0 && (
            <div className='py-20 text-center'>
              <p className='text-lg font-semibold'>
                아직 일치하는 리뷰가 없어요.
              </p>
              <p className='mt-2 text-sm text-stone-500'>
                다른 검색어나 카테고리로 찾아보세요.
              </p>
              <button
                type='button'
                onClick={() => {
                  setQuery('');
                  setCategory('전체');
                  setPage(1);
                }}
                className='mt-5 cursor-pointer text-sm font-semibold text-[#23745b] underline underline-offset-4'
              >
                전체 리뷰 보기
              </button>
            </div>
          )}
        </div>
      </div>

      {pageCount > 0 && (
        <ReviewPagination
          page={page}
          pageCount={pageCount}
          onPageChange={changePage}
        />
      )}
      <p className='mt-4 text-center text-[10px] text-stone-400'>
        {filteredReviews.length}개의 이야기 · 페이지당 {PAGE_SIZE}개
      </p>
    </section>
  );
};

export default ReviewFeed;
