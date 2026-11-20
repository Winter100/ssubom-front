import { type JSONContent } from '@tiptap/react';
import { ReviewData } from '../_features/review/lib/review-types';

type Author = {
  id: number;
  nickname: string;
  profileImage?: string | null;
};
export type CategoryType = {
  id: number;
  category: string;
};

export type ReviewCategoryCount = {
  categoryId: number;
  category: string;
  count: number;
};

export type ReviewType = {
  id: number;
  title: string;
  product: string;
  category: CategoryType;
  rating: number;
  createdAt: string;
  mainImageKey: string | null;
  author: Author;
  content: JSONContent;
  duration: string;
  pros?: string[];
  cons?: string[];
  verdict?: string;
  viewCount: number;
  isLike: boolean;
  likeCount: number;
};

export type ReviewsPage = {
  content: ReviewType[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ReviewDetail = ReviewType & {
  isReported?: boolean;
  isReportedToday?: boolean;
};

export type ReviewsParams = Pick<ReviewSearchParams, 'page' | 'size'> &
  Partial<Omit<ReviewSearchParams, 'page' | 'size'>>;

export type ReviewSearchParams = {
  page: number;
  size: number;
  categoryId?: number;
  query?: string;
  searchType?: 'title' | 'author';
  sort: 'latest' | 'rating';
};

export type CreateReviewInput = {
  review: ReviewData;
  files: ReadonlyMap<string, File>;
};
