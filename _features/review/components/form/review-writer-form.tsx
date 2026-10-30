'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { ReviewFields } from '../../lib/review-types';
import { hasRequiredReviewFields } from '../../lib/review-validation';
import { MAX_VERDICT_LENGTH } from '../../lib/review-limits';
import type {
  ChangeReviewField,
  HandleReviewImage,
} from '../../hooks/use-review-writer';
import ReviewBasicsFields from './review-basics-fields';
import ReviewCoverImage from './review-cover-image';
import ReviewBodyEditor from './review-body-editor';
import PointFields from './point-fields';
import type { CategoryType } from '@/_types/review';

const inputClass =
  'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#23745b] focus:ring-2 focus:ring-emerald-100';

type ReviewWriterFormProps = {
  fields: ReviewFields;
  changeField: ChangeReviewField;
  editor: Editor | null;
  readingImage: boolean;
  isSubmitting: boolean;
  handleImage: HandleReviewImage;
  categoryList: CategoryType[];
  submitReview: () => void;
  saveDraft: () => void;
};

const ReviewWriterForm = ({
  fields,
  changeField,
  editor,
  readingImage,
  isSubmitting,
  handleImage,
  submitReview,
  categoryList,
  saveDraft,
}: ReviewWriterFormProps) => {
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const busy = readingImage || isSubmitting;

  const handleSubmit = () => {
    if (busy) return;
    setSubmitAttempted(true);
    if (
      !hasRequiredReviewFields(fields) ||
      !categoryList.some((category) => category.id === fields.category?.id)
    ) {
      return;
    }
    submitReview();
  };

  return (
    <fieldset
      disabled={isSubmitting}
      aria-busy={isSubmitting}
      className='grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_260px] disabled:opacity-60'
    >
      <div className='min-w-0 space-y-8'>
        <ReviewBasicsFields
          fields={fields}
          changeField={changeField}
          showErrors={submitAttempted}
          categoryList={categoryList}
        />

        <ReviewCoverImage
          image={fields.image}
          disabled={busy || !editor}
          onChange={(event) => handleImage(event, 'cover')}
          onRemove={() => changeField('image', '')}
        />

        <ReviewBodyEditor
          editor={editor}
          readingImage={busy}
          onImage={(event) => handleImage(event, 'body')}
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <PointFields
            label='이런 점이 좋았어요'
            items={fields.pros}
            onChange={(items) => changeField('pros', items)}
            tone='green'
          />
          <PointFields
            label='이런 점은 아쉬웠어요'
            items={fields.cons}
            onChange={(items) => changeField('cons', items)}
            tone='sand'
          />
        </div>
        <section className='rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'>
          <p className='text-[10px] font-semibold tracking-widest text-[#8b9a80]'>
            MY FINAL THOUGHTS
          </p>
          <label className='mt-3 block text-lg font-semibold'>
            이런 분께 추천해요
            <textarea
              rows={4}
              maxLength={MAX_VERDICT_LENGTH}
              aria-describedby='review-verdict-count'
              value={fields.verdict}
              onChange={(event) => changeField('verdict', event.target.value)}
              placeholder='어떤 분에게 잘 맞을까요? 마지막 생각을 남겨주세요.'
              className={`${inputClass} h-40 font-normal leading-7 resize-none`}
            />
          </label>
          <p
            id='review-verdict-count'
            className='text-right text-xs text-stone-500'
          >
            {fields.verdict.length}/{MAX_VERDICT_LENGTH}
          </p>
        </section>
      </div>
      <aside className='space-y-5 lg:sticky lg:top-8'>
        <section className='rounded-2xl border border-stone-200 bg-white p-6'>
          <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
            A LITTLE WRITING GUIDE
          </p>
          <h2 className='mt-4 text-lg leading-8 font-semibold'>
            완벽한 글보다,
            <br />
            솔직한 경험이 좋아요.
          </h2>
          <ul className='mt-5 space-y-4 text-xs leading-6 text-stone-500'>
            <li>01. 어떤 계기로 사용하게 됐나요?</li>
            <li>02. 일상에서 어떻게 사용했나요?</li>
            <li>03. 기대와 달랐던 점도 알려주세요.</li>
          </ul>
        </section>
        <div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={saveDraft}
              disabled={!editor || busy}
              className='cursor-pointer rounded-full border border-stone-200 px-4 py-2.5 text-xs font-medium hover:bg-stone-100 disabled:opacity-40'
            >
              임시 저장
            </button>
            {/* <button
              type='button'
              disabled={!editor || busy}
              // onClick={togglePreview}
              className='cursor-pointer rounded-full bg-[#23745b] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#185b46] disabled:opacity-40'
            >
              {preview ? '← 이어서 작성' : '미리보기 ↗'}
            </button> */}
            <button
              type='button'
              onClick={handleSubmit}
              disabled={busy}
              className='cursor-pointer rounded-full bg-[#23745b] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#185b46] disabled:opacity-40'
            >
              {isSubmitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </div>
        <p className='px-2 text-[10px] leading-6 text-stone-400'>
          임시 저장은 이 브라우저에만 보관됩니다. 이미지를 많이 넣으면 저장
          공간이 부족할 수 있어요. 다른 기기와 공유되지는 않습니다.
        </p>
      </aside>
    </fieldset>
  );
};

export default ReviewWriterForm;
