'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import type { User } from '@/_types/auth';
import { ApiError } from '@/_lib/api/api';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import { COMMENT_CONTENT_LIMIT } from '../../lib/comment-api';
import { getReviewImageUrl } from '../../lib/review-image';

type CommentFormProps = {
  user: User;
  label: string;
  initialContent?: string;
  disabled: boolean;
  onSave: (content: string) => Promise<void>;
  onCancel?: () => void;
};

const CommentForm = ({
  user,
  label,
  initialContent = '',
  disabled,
  onSave,
  onCancel,
}: CommentFormProps) => {
  const inputId = useId();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const busy = disabled || submitting;

  const save = async (): Promise<void> => {
    if (
      busy ||
      submittingRef.current ||
      !content.trim() ||
      content.length > COMMENT_CONTENT_LIMIT
    )
      return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(content);
      setContent('');
    } catch (cause: unknown) {
      const fieldError =
        cause instanceof ApiError
          ? cause.errors?.find(({ field }) => field === 'content')?.message
          : undefined;
      setError(
        fieldError || getAuthErrorMessage(cause, '댓글을 저장하지 못했습니다.'),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form
      aria-label={label}
      aria-busy={submitting}
      className='mt-5 rounded-2xl border border-[#dfe8df] bg-[#f6f8f4] p-4 sm:p-5'
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className='flex items-center gap-2'>
        <Image
          key={user.profileImage}
          src={getReviewImageUrl(user.profileImage) || '/default-profile.svg'}
          alt=''
          width={32}
          height={32}
          unoptimized
          onError={(event) => {
            event.currentTarget.srcset = '';
            event.currentTarget.src = '/default-profile.svg';
          }}
          className='size-8 shrink-0 rounded-full border border-stone-200 bg-white object-cover'
        />
        <span className='text-xs font-semibold break-all text-[#405b49]'>
          {user.nickname}
        </span>
      </div>
      <textarea
        id={inputId}
        name='content'
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setError(null);
        }}
        disabled={busy}
        maxLength={COMMENT_CONTENT_LIMIT}
        rows={4}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={`${inputId}-count${error ? ` ${inputId}-error` : ''}`}
        placeholder='리뷰에 대한 궁금한 점이나 함께 나누고 싶은 이야기를 적어주세요.'
        className='mt-2 block resize-none h-24 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-7 text-stone-600 outline-none placeholder:text-stone-400 focus:border-[#36765d] focus:ring-2 focus:ring-emerald-100 disabled:opacity-60'
      />
      <p
        id={`${inputId}-count`}
        className='mt-2 text-right text-[11px] text-stone-400 tabular-nums'
      >
        {content.length} / {COMMENT_CONTENT_LIMIT}
      </p>
      {error && (
        <p
          id={`${inputId}-error`}
          role='alert'
          className='mt-2 text-xs text-red-700'
        >
          {error}
        </p>
      )}
      <div className='mt-3 flex flex-wrap items-center justify-end gap-3'>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            disabled={busy}
            className='rounded-lg px-3 py-2 text-xs text-stone-500 disabled:opacity-50'
          >
            취소
          </button>
        )}
        <button
          type='submit'
          disabled={
            busy || !content.trim() || content.length > COMMENT_CONTENT_LIMIT
          }
          className='cursor-pointer rounded-xl bg-[#23745b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#185b46] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {submitting ? '저장 중…' : label}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
