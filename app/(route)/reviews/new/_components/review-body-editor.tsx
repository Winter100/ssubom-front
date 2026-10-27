'use client';

import { useRef, type ChangeEvent } from 'react';
import { EditorContent, useEditorState, type Editor } from '@tiptap/react';
import { countBodyImages, MAX_BODY_IMAGES } from '../_lib/review-limits';
import EditorToolbar from './editor-toolbar';
import './review-body-editor.css';

type ReviewBodyEditorProps = {
  editor: Editor | null;
  readingImage: boolean;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
};

const ReviewBodyEditor = ({
  editor,
  readingImage,
  onImage,
}: ReviewBodyEditorProps) => {
  const bodyImageInput = useRef<HTMLInputElement>(null);
  const imageCount =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        current ? countBodyImages(current.getJSON()) : 0,
    }) ?? 0;
  const imageDisabled = readingImage || imageCount >= MAX_BODY_IMAGES;

  return (
    <section>
      <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
        03 · YOUR HONEST STORY
      </p>
      <h2 className='mt-2 text-lg font-semibold'>진짜 써본 이야기</h2>
      <p className='mt-2 text-xs leading-6 text-stone-400'>
        문단 스타일에서 제목 크기를 선택하고, 글을 선택해 굵게 표시하거나
        이미지를 넣어보세요.
      </p>

      <div className='mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white'>
        {editor ? (
          <EditorToolbar
            editor={editor}
            onImage={() => bodyImageInput.current?.click()}
            imageDisabled={imageDisabled}
          />
        ) : (
          <p className='p-4 text-xs text-stone-400'>
            편집기를 준비하고 있습니다…
          </p>
        )}
        <EditorContent editor={editor} />
        <input
          ref={bodyImageInput}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          aria-label='본문 이미지 선택'
          aria-describedby='review-body-image-count'
          disabled={imageDisabled}
          onChange={onImage}
          className='hidden'
        />
      </div>
      <p
        id='review-body-image-count'
        aria-live='polite'
        className='mt-2 text-right text-xs text-stone-500'
      >
        본문 이미지 {imageCount}/{MAX_BODY_IMAGES}
      </p>
    </section>
  );
};

export default ReviewBodyEditor;
