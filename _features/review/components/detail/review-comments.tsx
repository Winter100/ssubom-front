'use client';

import { useRef, useState } from 'react';
import { useMe } from '@/_features/auth/hooks/use-auth';
import { getAuthErrorMessage } from '@/_lib/auth-client';
import type { User } from '@/_types/auth';
import type { CommentAction, ReviewComment } from '@/_types/comment';
import { useComments, useCommentAction } from '../../hooks/use-comments';
import CommentForm from './comment-form';
import CommentThread from './comment-thread';
import LoadingSpinner from '@/_features/common/components/loading-spinner';
import WithdrawalNotice from '@/_features/my/components/withdrawal-notice';
import { useWithdrawal } from '@/_features/my/hooks/use-withdrawal';

const ReviewComments = ({ reviewId }: { reviewId: string }) => {
  const { data: user, isPending } = useMe();
  const currentUser = !isPending && user ? user : null;

  return (
    <section
      id='review-comments'
      aria-labelledby='review-comments-title'
      className='mt-10 scroll-mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7'
    >
      <p className='text-[10px] font-semibold tracking-[0.16em] text-[#7a8e78]'>
        SHARE YOUR THOUGHTS
      </p>
      <h2 id='review-comments-title' className='mt-2 text-lg font-semibold'>
        함께 나누는 이야기
      </h2>
      <CommentsContent
        key={`${reviewId}:${currentUser?.id ?? 'anonymous'}`}
        reviewId={reviewId}
        user={currentUser}
      />
    </section>
  );
};

const CommentsContent = ({
  reviewId,
  user,
}: {
  reviewId: string;
  user: User | null;
}) => {
  const comments = useComments(reviewId);
  const withdrawal = useWithdrawal();
  const action = useCommentAction(reviewId);
  const actionLock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const runAction = async (input: CommentAction): Promise<void> => {
    if (actionLock.current)
      throw new Error('진행 중인 요청이 있습니다. 잠시 후 다시 시도해 주세요.');
    actionLock.current = true;
    try {
      await action.mutateAsync(input);
    } finally {
      actionLock.current = false;
    }
  };
  const openDelete = (comment: ReviewComment): void => {
    if (actionLock.current || withdrawal.blocked) return;
    setDeleteTarget(comment.id);
    setDeleteError(null);
    dialog.current?.showModal();
  };
  const confirmDelete = async (): Promise<void> => {
    if (deleteTarget === null || actionLock.current || withdrawal.blocked) return;
    setDeleteError(null);
    try {
      await runAction({ type: 'delete', commentId: deleteTarget });
      dialog.current?.close();
      setDeleteTarget(null);
    } catch (cause: unknown) {
      setDeleteError(getAuthErrorMessage(cause, '댓글을 삭제하지 못했습니다.'));
    }
  };
  const renderThreads = (threads: ReviewComment[]) => (
    <ul aria-label='댓글 목록' className='mt-7 divide-y divide-stone-200/70'>
      {threads.map((thread) => (
        <li key={thread.id} className='py-6 first:pt-0 last:pb-0'>
          <CommentThread
            thread={thread}
            user={user}
            busy={action.isPending}
            writeBlocked={withdrawal.blocked}
            onAction={runAction}
            onDelete={openDelete}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {user && (
        <WithdrawalNotice />
      )}
      {user && (
        <CommentForm
          user={user}
          label='댓글 등록'
          disabled={action.isPending || withdrawal.blocked}
          onSave={(content) =>
            runAction({ type: 'create', parentId: null, content })
          }
        />
      )}
      {comments.isPending && (
        <LoadingSpinner />
      )}
      {comments.isError && (
        <div
          role='alert'
          className='mt-6 rounded-xl bg-stone-50 p-4 text-xs text-stone-600'
        >
          <p>
            {getAuthErrorMessage(comments.error, '댓글을 불러오지 못했습니다.')}
          </p>
          <button
            type='button'
            disabled={comments.isFetching}
            onClick={() => void comments.refetch()}
            className='mt-3 cursor-pointer text-[#23745b] underline disabled:opacity-50'
          >
            다시 시도
          </button>
        </div>
      )}
      {comments.threads.length > 0 && renderThreads(comments.threads)}
      {!comments.isPending &&
        !comments.isError &&
        comments.threads.length === 0 &&
        comments.recent.length === 0 && (
          <p className='py-10 text-center text-sm text-stone-400'>
            아직 댓글이 없습니다. 첫 이야기를 남겨주세요.
          </p>
        )}
      {comments.hasNextPage && (
        <button
          type='button'
          disabled={comments.isFetching || action.isPending}
          onClick={() => void comments.fetchNextPage()}
          className='mt-6 w-full cursor-pointer rounded-xl border border-stone-200 py-3 text-xs font-medium text-[#405b49] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {comments.isFetchingNextPage ? '불러오는 중…' : '댓글 더 보기'}
        </button>
      )}
      {comments.recent.length > 0 && (
        <div className='mt-7 border-t border-[#dfe8df] pt-5'>
          <p className='text-xs font-semibold text-[#36765d]'>
            방금 등록한 댓글
          </p>
          <p className='mt-2 text-xs leading-6 text-stone-400'>
            작성하신 댓글을 먼저 보여드려요. 이전 댓글은 더 보기로 이어서 읽을
            수 있습니다.
          </p>
          {renderThreads(comments.recent)}
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby='comment-delete-title'
        aria-describedby='comment-delete-description'
        onCancel={(event) => {
          if (actionLock.current) event.preventDefault();
        }}
        className='m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-[#202a26] shadow-xl backdrop:bg-stone-900/30'
      >
        <h3 id='comment-delete-title' className='text-lg font-semibold'>
          댓글을 삭제할까요?
        </h3>
        <p
          id='comment-delete-description'
          className='mt-3 text-sm leading-7 text-stone-500'
        >
          삭제 후에는 복구할 수 없으며, 댓글 자리는 유지됩니다.
        </p>
        {deleteError && (
          <p role='alert' className='mt-3 text-xs text-red-700'>
            {deleteError}
          </p>
        )}
        <div className='mt-6 flex justify-end gap-3'>
          <button
            type='button'
            disabled={action.isPending}
            onClick={() => {
              if (!actionLock.current) dialog.current?.close();
            }}
            className='rounded-xl cursor-pointer border border-stone-200 px-4 py-2 text-xs disabled:opacity-50'
          >
            취소
          </button>
          <button
            type='button'
            disabled={action.isPending || withdrawal.blocked}
            onClick={() => void confirmDelete()}
            className='rounded-xl cursor-pointer bg-[#23745b] px-4 py-2 text-xs text-white disabled:opacity-50'
          >
            {action.isPending ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </dialog>
    </>
  );
};

export default ReviewComments;
