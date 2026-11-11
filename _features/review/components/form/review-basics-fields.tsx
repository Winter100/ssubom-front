'use client';

import { getCategoryIcon } from '../../lib/category-icon';
import type { ReviewFields } from '../../lib/review-types';
import {
  MAX_TITLE_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_DURATION_LENGTH,
} from '../../lib/review-limits';
import { isValidReviewRating } from '../../lib/review-validation';
import type { ChangeReviewField } from '../../hooks/use-review-writer';
import type { CategoryType } from '@/_types/review';

const inputClass =
  'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100 aria-invalid:border-red-300 aria-invalid:focus:border-red-400 aria-invalid:focus:ring-red-100';

const ratingButtonClass =
  'size-9 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white text-lg hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-[#23745b] disabled:cursor-default disabled:opacity-40';

type ReviewBasicsFieldsProps = {
  fields: ReviewFields;
  changeField: ChangeReviewField;
  showErrors: boolean;
  categoryList: CategoryType[];
};

const ReviewBasicsFields = ({
  fields,
  changeField,
  showErrors,
  categoryList,
}: ReviewBasicsFieldsProps) => {
  const categoryMissing = !categoryList.some(
    (category) => category.id === fields.category?.id,
  );
  const ratingInvalid = showErrors && !isValidReviewRating(fields.rating);
  const titleInvalid =
    showErrors &&
    (!fields.title.trim() || fields.title.length > MAX_TITLE_LENGTH);
  const productInvalid =
    showErrors &&
    (!fields.product.trim() || fields.product.length > MAX_PRODUCT_LENGTH);
  const durationInvalid =
    showErrors &&
    (!fields.duration.trim() || fields.duration.length > MAX_DURATION_LENGTH);
  const adjustRating = (delta: number) => {
    const rating = Math.round((fields.rating + delta) * 10) / 10;
    changeField('rating', Math.min(5, Math.max(0, rating)));
  };

  return (
    <section className='rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
      <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
        01 · THE BASICS
      </p>
      <h2 className='mt-2 text-lg font-semibold'>어떤 상품을 써보셨나요?</h2>

      <div className='mt-5'>
        <div>
          <label className='block text-xs font-medium'>
            리뷰 제목{' '}
            <span aria-hidden='true' className='text-red-600'>
              *
            </span>
            {titleInvalid && (
              <span
                id='review-title-error'
                role='alert'
                className='ml-2 inline-block font-semibold text-red-600'
              >
                {fields.title.length > MAX_TITLE_LENGTH
                  ? `최대 ${MAX_TITLE_LENGTH}자까지 입력할 수 있습니다.`
                  : '리뷰 제목을 입력해 주세요.'}
              </span>
            )}
            <input
              required
              aria-invalid={titleInvalid}
              aria-describedby={
                titleInvalid
                  ? 'review-title-count review-title-error'
                  : 'review-title-count'
              }
              value={fields.title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => changeField('title', event.target.value)}
              placeholder='경험이 느껴지는 제목을 적어주세요'
              className={inputClass}
            />
            <span
              id='review-title-count'
              className='mt-1 block text-right text-xs font-normal text-stone-500'
            >
              {fields.title.length}/{MAX_TITLE_LENGTH}
            </span>
          </label>
        </div>

        <div className='mt-5'>
          <label className='text-xs font-medium'>
            상품명{' '}
            <span aria-hidden='true' className='text-red-600'>
              *
            </span>
            {productInvalid && (
              <span
                id='review-product-error'
                role='alert'
                className='ml-2 inline-block font-semibold text-red-600'
              >
                {fields.product.length > MAX_PRODUCT_LENGTH
                  ? `최대 ${MAX_PRODUCT_LENGTH}자까지 입력할 수 있습니다.`
                  : '상품명을 입력해 주세요.'}
              </span>
            )}
            <input
              required
              aria-invalid={productInvalid}
              aria-describedby={
                productInvalid
                  ? 'review-product-count review-product-error'
                  : 'review-product-count'
              }
              value={fields.product}
              maxLength={MAX_PRODUCT_LENGTH}
              onChange={(event) => changeField('product', event.target.value)}
              placeholder='브랜드와 상품명을 알려주세요'
              className={inputClass}
            />
            <span
              id='review-product-count'
              className='mt-1 block text-right text-xs font-normal text-stone-500'
            >
              {fields.product.length}/{MAX_PRODUCT_LENGTH}
            </span>
          </label>
        </div>
        <div className='mt-5 grid gap-5 sm:grid-cols-2'>
          <label className='text-xs font-medium'>
            카테고리{' '}
            <span aria-hidden='true' className='text-red-600'>
              *
            </span>
            {showErrors && categoryMissing && (
              <span
                id='review-category-error'
                role='alert'
                className='ml-2 inline-block font-semibold text-red-600'
              >
                카테고리를 선택해 주세요.
              </span>
            )}
            <select
              required
              aria-invalid={showErrors && categoryMissing}
              aria-describedby={
                showErrors && categoryMissing
                  ? 'review-category-error'
                  : undefined
              }
              value={fields.category?.id ?? ''}
              onChange={(event) => {
                const category = categoryList.find(
                  (item) => item.id === Number(event.target.value),
                );
                if (category) changeField('category', category);
              }}
              className={inputClass}
            >
              <option value='' disabled>
                카테고리를 선택해 주세요
              </option>
              {categoryList.map((item) => (
                <option key={item.id} value={item.id}>
                  {getCategoryIcon(item.category)} {item.category}
                </option>
              ))}
            </select>
          </label>
          <label className='text-xs font-medium'>
            사용 기간 또는 구매 횟수{' '}
            <span aria-hidden='true' className='text-red-600'>
              *
            </span>
            {durationInvalid && (
              <span
                id='review-duration-error'
                role='alert'
                className='ml-2 inline-block font-semibold text-red-600'
              >
                {fields.duration.length > MAX_DURATION_LENGTH
                  ? `최대 ${MAX_DURATION_LENGTH}자까지 입력할 수 있습니다.`
                  : '사용 기간 또는 구매 횟수를 입력해 주세요.'}
              </span>
            )}
            <input
              required
              aria-invalid={durationInvalid}
              aria-describedby={
                durationInvalid
                  ? 'review-duration-count review-duration-error'
                  : 'review-duration-count'
              }
              value={fields.duration}
              maxLength={MAX_DURATION_LENGTH}
              onChange={(event) => changeField('duration', event.target.value)}
              placeholder='예: 3개월 사용 또는 3회 구매'
              className={inputClass}
            />
            <span
              id='review-duration-count'
              className='mt-1 block text-right text-xs font-normal text-stone-500'
            >
              {fields.duration.length}/{MAX_DURATION_LENGTH}
            </span>
          </label>
        </div>

        <div className='mt-6 border-t border-stone-100 pt-5'>
          <label
            htmlFor='review-rating'
            className='flex items-center justify-between text-xs font-medium'
          >
            <span>
              사용 후 점수{' '}
              <span aria-hidden='true' className='text-red-600'>
                *
              </span>
              {ratingInvalid && (
                <span
                  id='review-rating-error'
                  role='alert'
                  className='ml-2 inline-block font-semibold text-red-600'
                >
                  평점을 0~5점 사이로 설정해 주세요.
                </span>
              )}
            </span>
            <span className='text-lg font-bold'>
              <span aria-hidden='true' className='mr-1 text-[#d7a459]'>
                ★
              </span>
              {fields.rating.toFixed(1)}{' '}
              <span className='text-xs font-normal text-stone-400'>/ 5</span>
            </span>
          </label>
          <div className='mt-3 flex items-center gap-3'>
            <button
              type='button'
              aria-label='평점 0.1점 낮추기'
              disabled={fields.rating <= 0}
              onClick={() => adjustRating(-0.1)}
              className={ratingButtonClass}
            >
              −
            </button>
            <input
              id='review-rating'
              type='range'
              aria-invalid={ratingInvalid}
              aria-describedby={
                ratingInvalid ? 'review-rating-error' : undefined
              }
              min='0'
              max='5'
              step='0.1'
              value={fields.rating}
              onChange={(event) =>
                changeField('rating', event.target.valueAsNumber)
              }
              className='min-w-0 flex-1 cursor-pointer accent-[#23745b] aria-invalid:rounded aria-invalid:ring-1 aria-invalid:ring-red-300 aria-invalid:ring-offset-2'
            />
            <button
              type='button'
              aria-label='평점 0.1점 높이기'
              disabled={fields.rating >= 5}
              onClick={() => adjustRating(0.1)}
              className={ratingButtonClass}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
export default ReviewBasicsFields;
