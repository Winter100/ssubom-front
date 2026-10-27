'use client';

import Image from 'next/image';
import { EditorContent, useEditor } from '@tiptap/react';
import { createExtensions, richTextClasses } from '../_lib/editor-config';
import type { ReviewData } from '../_lib/review-types';

export type PreviewData = ReviewData;

const ReviewPreview = ({ review }: { review: PreviewData }) => {
  const editor = useEditor({
    extensions: createExtensions(),
    content: review.body,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: richTextClasses } },
  });

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
      <article className="min-w-0">
        <span className="rounded-full bg-[#e8efe5] px-3 py-1.5 text-[10px] font-medium text-[#50755c]">{review.category?.category}</span>
        <h1 className="mt-5 text-2xl leading-relaxed font-bold tracking-tight break-keep sm:text-4xl sm:leading-snug">{review.title || '리뷰 제목을 입력해 주세요'}</h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7 text-xs text-stone-400">
          <span className="flex items-center gap-2.5 text-stone-700"><span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-[#e9eee5] text-sm text-[#66785a]">{Array.from(review.author.trim())[0] || '나'}</span>{review.author || '작성자'}</span>
          <span>작성 미리보기 · 조회 0</span>
        </div>
        {review.image ? <div className="relative mt-7 aspect-[16/10] overflow-hidden rounded-2xl"><Image src={review.image} alt={review.product || '리뷰 대표 이미지'} fill unoptimized className="object-cover" /></div> : <div className="mt-7 grid aspect-[16/10] place-items-center rounded-2xl bg-[#edf3ec] text-sm text-[#8b9a80]">대표 이미지를 선택해 주세요</div>}
        <div className="my-8 flex items-center justify-between gap-4 rounded-xl border border-[#dfe8df] bg-[#edf3ec] p-5"><div><p className="text-[10px] text-[#6c8067]">직접 사용하고 남긴 점수</p><p className="mt-1 text-sm font-semibold">{review.product || '상품명'}</p></div><div className="shrink-0"><span aria-hidden="true" className="mr-2 text-xl text-[#d7a459]">★</span><span className="text-2xl font-bold">{review.rating.toFixed(1)}</span><span className="ml-1 text-xs text-stone-400">/ 5</span></div></div>
        <EditorContent editor={editor} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-[#edf3ec] p-6"><h2 className="text-sm font-semibold text-[#36765d]">＋ 이런 점이 좋았어요</h2><ul className="mt-4 space-y-3 text-xs leading-6 text-stone-600">{review.pros.filter((item) => item.trim()).map((item, index) => <li key={index} className="flex gap-2 break-words"><span aria-hidden="true" className="text-[#8a9c7d]">✓</span>{item}</li>)}</ul></section>
          <section className="rounded-2xl bg-[#f1eee6] p-6"><h2 className="text-sm font-semibold text-[#8f7953]">− 이런 점은 아쉬웠어요</h2><ul className="mt-4 space-y-3 text-xs leading-6 text-stone-600">{review.cons.filter((item) => item.trim()).map((item, index) => <li key={index} className="flex gap-2 break-words"><span aria-hidden="true" className="text-[#b4a384]">·</span>{item}</li>)}</ul></section>
        </div>
        <section className="my-10 border-l-2 border-[#9eaf8e] py-1 pl-6"><p className="text-[10px] font-semibold tracking-widest text-[#8b9a80]">MY FINAL THOUGHTS</p><h2 className="mt-3 text-lg font-semibold">이런 분께 추천해요</h2><p className="mt-3 text-sm leading-8 whitespace-pre-wrap break-words text-stone-600">{review.verdict || '어떤 분께 추천하고 싶은지 작성해 주세요.'}</p></section>
      </article>
      <aside className="rounded-2xl border border-stone-200 bg-white p-6 lg:sticky lg:top-8"><p className="text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]">REVIEW AT A GLANCE</p><h2 className="mt-4 text-xl font-semibold tracking-tight break-words">{review.product || '상품명'}</h2><dl className="mt-5 space-y-4 text-xs"><div className="flex justify-between gap-4"><dt className="shrink-0 text-stone-400">사용 기간</dt><dd className="break-words">{review.duration || '미입력'}</dd></div><div className="flex justify-between gap-4"><dt className="text-stone-400">카테고리</dt><dd>{review.category?.category}</dd></div><div className="flex justify-between gap-4"><dt className="text-stone-400">작성자 평점</dt><dd>★ {review.rating.toFixed(1)} / 5</dd></div></dl></aside>
    </div>
  );
};

export default ReviewPreview;
