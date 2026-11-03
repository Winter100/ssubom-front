import type { CommentAction, ReviewComment } from '@/_types/comment';

export const updateCommentThreads = (
  threads: ReviewComment[],
  action: CommentAction,
  created?: ReviewComment,
): ReviewComment[] => {
  if (action.type === 'create') {
    if (!created) return threads;
    if (created.parentId === null) {
      return threads.some(({ id }) => id === created.id) ? threads : [...threads, created];
    }
    return threads.map((thread) => {
      if (thread.id !== created.parentId || thread.replies.some(({ id }) => id === created.id)) {
        return thread;
      }
      return { ...thread, replies: [...thread.replies, created] };
    });
  }

  const update = (comment: ReviewComment): ReviewComment => {
    if (comment.id !== action.commentId) return comment;
    return action.type === 'update'
      ? { ...comment, content: action.content }
      : { ...comment, content: '삭제된 댓글입니다', author: null, deleted: true };
  };
  return threads.map((thread) => ({
    ...update(thread),
    replies: thread.replies.map(update),
  }));
};

export const uniqueCommentThreads = (threads: ReviewComment[]): ReviewComment[] => {
  const seen = new Set<number>();
  return threads.filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
