'use client';

import Link from 'next/link';
import { useReviewWriter } from '../../hooks/use-review-writer';
import ReviewPreview from '../review-preview';
import ReviewWriterForm from './review-writer-form';
import { useCategories } from '../../hooks/use-review';

// <div className='flex items-center gap-2'>
//   <button
//     type='button'
//     onClick={saveDraft}
//     disabled={!editor || readingImage}
//     className='cursor-pointer rounded-full border border-stone-200 px-4 py-2.5 text-xs font-medium hover:bg-stone-100 disabled:opacity-40'
//   >
//     임시 저장
//   </button>
//   <button
//     type='button'
//     disabled={!editor || readingImage}
//     onClick={togglePreview}
//     className='cursor-pointer rounded-full bg-[#23745b] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#185b46] disabled:opacity-40'
//   >
//     {preview ? '← 이어서 작성' : '미리보기 ↗'}
//   </button>
//   <button
//     type='button'
//     onClick={submitReview}
//     disabled={!editor || readingImage}
//     className='cursor-pointer rounded-full bg-[#23745b] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#185b46] disabled:opacity-40'
//   >
//     전송
//   </button>
// </div>

const ReviewWriter = () => {
  const {
    fields,
    preview,
    message,
    error,
    readingImage,
    isSubmitting,
    resetVersion,
    editor,
    changeField,
    handleImage,
    saveDraft,
    submitReview,
    togglePreview,
  } = useReviewWriter();

  const { data } = useCategories();

  return (
    <div className='min-h-screen bg-[#fafbf9] font-sans text-[#202a26] selection:bg-emerald-100'>
      <main className='mx-auto max-w-6xl px-5 py-9 sm:px-10 sm:py-12'>
        <Link
          href='/#reviews'
          className='text-xs text-stone-400 hover:text-[#23745b]'
        >
          ← 리뷰 둘러보기
        </Link>
        <div className='mt-7 mb-8'>
          <p className='text-[10px] font-semibold tracking-[0.18em] text-[#7b8b7c]'>
            {preview ? 'PREVIEW YOUR STORY' : 'WRITE YOUR EXPERIENCE'}
          </p>
          <h1 className='mt-3 text-3xl font-bold tracking-tight'>
            {preview ? '이렇게 보여요.' : '써본 이야기를 들려주세요.'}
          </h1>
          <p className='mt-3 text-xs leading-6 text-stone-500'>
            {preview
              ? '상세 페이지 형태의 미리보기입니다. 이어서 작성 버튼으로 돌아갈 수 있어요.'
              : '작은 경험 하나가 누군가의 선택에 도움이 될 수 있어요.'}
            <br />
            현재는 작성·미리보기·브라우저 임시 저장만 가능하며, 공개 게시되지는
            않습니다.
          </p>
        </div>
        {error && (
          <p
            role='alert'
            className='mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700'
          >
            {error}
          </p>
        )}
        <p role='status' className='mb-4 text-xs text-[#23745b]'>
          {isSubmitting
            ? '리뷰를 전송하는 중입니다…'
            : readingImage
              ? '이미지를 불러오는 중입니다…'
              : message}
        </p>
        <div hidden={preview !== null}>
          <ReviewWriterForm
            key={resetVersion}
            fields={fields}
            changeField={changeField}
            editor={editor}
            readingImage={readingImage}
            isSubmitting={isSubmitting}
            handleImage={handleImage}
            submitReview={submitReview}
            saveDraft={saveDraft}
            categoryList={data ?? []}
          />
        </div>
        {preview && <ReviewPreview review={preview} />}
      </main>
    </div>
  );
};

export default ReviewWriter;
