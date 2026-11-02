import type { JSONContent } from '@tiptap/react';
import type { CategoryType } from '@/_types/review';

export type ReviewFields = {
  title: string;
  product: string;
  category: CategoryType | null;
  duration: string;
  rating: number;
  image: string;
  pros: string[];
  cons: string[];
  verdict: string;
};

export type ReviewData = ReviewFields & { body: JSONContent };

export type ReviewCreateRequest = Omit<ReviewData, 'category' | 'image' | 'body'> & {
  content: JSONContent;
  mainImageKey: string | null;
  categoryId: number;
  subImageKeys: string[];
};

export type UpdateReviewInput = {
  reviewId: string;
  review: ReviewData;
  files: ReadonlyMap<string, File>;
  existingImages: ReadonlyMap<string, string>;
};

export const emptyFields: ReviewFields = {
  title: '',
  product: '',
  category: null,
  duration: '',
  rating: 0,
  image: '',
  pros: [''],
  cons: [''],
  verdict: '',
};
