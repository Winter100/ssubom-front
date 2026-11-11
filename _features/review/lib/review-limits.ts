import type { JSONContent } from '@tiptap/react';

export const MAX_BODY_IMAGES = 10;
export const MAX_TITLE_LENGTH = 30;
export const MAX_PRODUCT_LENGTH = 80;
export const MAX_DURATION_LENGTH = 30;
export const MAX_VERDICT_LENGTH = 500;

export const countBodyImages = (node: JSONContent): number =>
  (node.type === 'image' ? 1 : 0) +
  (node.content?.reduce((count, child) => count + countBodyImages(child), 0) ?? 0);
