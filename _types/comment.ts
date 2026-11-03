export type CommentAuthor = {
  id: number;
  nickname: string;
  profileImage: string | null;
};

export type ReviewComment = {
  id: number;
  parentId: number | null;
  content: string;
  deleted: boolean;
  createdAt: string;
  author: CommentAuthor | null;
  replies: ReviewComment[];
};

export type CommentPage = {
  content: ReviewComment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CreateCommentInput = {
  content: string;
  parentId: number | null;
};

export type CommentAction =
  | ({ type: 'create' } & CreateCommentInput)
  | { type: 'update'; commentId: number; content: string }
  | { type: 'delete'; commentId: number };
