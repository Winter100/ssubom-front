'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { User } from '@/_types/auth';
import type { CommentAction, ReviewComment } from '@/_types/comment';
import CommentForm from './comment-form';
import { getReviewImageUrl } from '../../lib/review-image';

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});
const actionClassName =
  'cursor-pointer rounded px-1 py-1 text-xs text-stone-500 hover:text-[#23745b] focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';

type CommentItemProps = {
  comment: ReviewComment;
  user: User | null;
  isReply: boolean;
  busy: boolean;
  writeBlocked: boolean;
  onEdit: () => void;
  onReply: () => void;
  onDelete: (comment: ReviewComment) => void;
};

const CommentItem = ({ comment, user, isReply, busy, writeBlocked, onEdit, onReply, onDelete }: CommentItemProps) => {
  const own = !comment.deleted && Boolean(user && user.id === comment.author?.id);
  const profileImage = getReviewImageUrl(
    own ? user?.profileImage : comment.author?.profileImage,
  ) || '/default-profile.svg';

  return (
    <article aria-label={isReply ? '답글' : '댓글'} className='flex min-w-0 gap-3'>
      {!comment.deleted && (
        <Image
          key={profileImage}
          src={profileImage}
          alt=''
          width={36}
          height={36}
          unoptimized
          onError={(event) => {
            event.currentTarget.srcset = '';
            event.currentTarget.src = '/default-profile.svg';
          }}
          className='size-9 shrink-0 rounded-full border border-stone-200 bg-stone-50 object-cover'
        />
      )}
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          {!comment.deleted && (
            <span className='text-sm font-semibold break-all text-[#405b49]'>
              {comment.author?.nickname ?? '알 수 없는 사용자'}
            </span>
          )}
          {own && <span className='rounded-full bg-[#edf3ec] px-2 py-0.5 text-[10px] font-medium text-[#36765d]'>나</span>}
          <time dateTime={comment.createdAt} className='text-[11px] text-stone-400 tabular-nums'>
            {dateFormatter.format(new Date(comment.createdAt))}
          </time>
        </div>
        <p
          className={`mt-2 text-sm leading-7 whitespace-pre-wrap break-words ${comment.deleted ? 'text-stone-400' : 'text-stone-600'}`}
        >
          {comment.deleted ? '삭제된 댓글입니다' : comment.content}
        </p>
        {!comment.deleted && user && (
          <div className='mt-2 flex flex-wrap items-center gap-3'>
            {!isReply && (
              <button type='button' disabled={busy || writeBlocked} onClick={onReply} className={actionClassName}>
                답글 달기
              </button>
            )}
            {own && (
              <>
                <button type='button' disabled={busy || writeBlocked} onClick={onEdit} className={actionClassName}>
                  수정
                </button>
                <button
                  type='button'
                  disabled={busy || writeBlocked}
                  onClick={() => onDelete(comment)}
                  aria-haspopup='dialog'
                  className={actionClassName}
                >
                  삭제
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

type CommentThreadProps = {
  thread: ReviewComment;
  user: User | null;
  busy: boolean;
  writeBlocked: boolean;
  onAction: (action: CommentAction) => Promise<void>;
  onDelete: (comment: ReviewComment) => void;
};

const CommentThread = ({ thread, user, busy, writeBlocked, onAction, onDelete }: CommentThreadProps) => {
  const [editor, setEditor] = useState<{ type: 'edit'; id: number } | { type: 'reply' } | null>(null);

  const renderComment = (comment: ReviewComment, isReply: boolean) => {
    if (user && !comment.deleted && user.id === comment.author?.id && editor?.type === 'edit' && editor.id === comment.id) {
      return (
        <CommentForm
          key={`edit-${comment.id}`}
          user={user}
          label='수정 저장'
          initialContent={comment.content}
          disabled={busy || writeBlocked}
          onCancel={() => setEditor(null)}
          onSave={async (content) => {
            await onAction({ type: 'update', commentId: comment.id, content });
            setEditor(null);
          }}
        />
      );
    }
    return (
      <CommentItem
        comment={comment}
        user={user}
        isReply={isReply}
        busy={busy}
        writeBlocked={writeBlocked}
        onEdit={() => setEditor({ type: 'edit', id: comment.id })}
        onReply={() => setEditor({ type: 'reply' })}
        onDelete={onDelete}
      />
    );
  };

  return (
    <>
      {renderComment(thread, false)}
      {thread.replies.length > 0 && (
        <ul aria-label='답글 목록' className='mt-5 ml-4 space-y-5 border-l-2 border-[#dfe8df] pl-4 sm:pl-7'>
          {thread.replies.map((reply) => <li key={reply.id}>{renderComment(reply, true)}</li>)}
        </ul>
      )}
      {user && !thread.deleted && editor?.type === 'reply' && (
        <div className='ml-4 border-l-2 border-[#dfe8df] pl-4 sm:pl-7'>
          <CommentForm
            key={`reply-${thread.id}`}
            user={user}
            label='답글 등록'
            disabled={busy || writeBlocked}
            onCancel={() => setEditor(null)}
            onSave={async (content) => {
              await onAction({ type: 'create', parentId: thread.id, content });
              setEditor(null);
            }}
          />
        </div>
      )}
    </>
  );
};

export default CommentThread;
