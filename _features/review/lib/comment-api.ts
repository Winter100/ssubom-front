import { apiPath } from '@/_constant/api-path';
import { api } from '@/_lib/api/api';
import type { CommentPage, CreateCommentInput, ReviewComment } from '@/_types/comment';
import { isValidReviewId } from './review-id';

export const COMMENT_CONTENT_LIMIT = 1000;
export const COMMENT_PAGE_SIZE = 20;

const commentsPath = (reviewId: string): string => {
  if (!isValidReviewId(reviewId)) throw new Error('올바른 리뷰 ID가 아닙니다.');
  return `${apiPath.reviews}/${reviewId}/comments`;
};

const commentPath = (reviewId: string, commentId: number): string => {
  if (!Number.isSafeInteger(commentId) || commentId < 1) {
    throw new Error('올바른 댓글 ID가 아닙니다.');
  }
  return `${commentsPath(reviewId)}/${commentId}`;
};

export const commentApi = {
  list: async (
    reviewId: string,
    page: number,
    size: number,
    signal?: AbortSignal,
  ): Promise<CommentPage> => {
    const { data } = await api.get<CommentPage>(commentsPath(reviewId), {
      params: { page, size },
      signal,
    });
    return data;
  },
  create: async (reviewId: string, input: CreateCommentInput): Promise<ReviewComment> => {
    const { data } = await api.post<ReviewComment>(commentsPath(reviewId), input);
    return data;
  },
  update: async (reviewId: string, commentId: number, content: string): Promise<void> => {
    await api.put(commentPath(reviewId, commentId), { content });
  },
  remove: async (reviewId: string, commentId: number): Promise<void> => {
    await api.delete(commentPath(reviewId, commentId));
  },
};
