import { type JSONContent } from '@tiptap/react';

type Author = {
  id: number;
  nickname: string;
};
export type CategoryType = {
  id: number;
  category: string;
};
export type ReviewType = {
  id: number;
  title: string;
  category: CategoryType;
  rating: number;
  createdAt: string;
  mainImageKey: string | null;
  author: Author;
  content: JSONContent;
};
