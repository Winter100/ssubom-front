import type { JSONContent } from '@tiptap/react';

export const MAX_BODY_IMAGES = 10;
export const MAX_VERDICT_LENGTH = 500;

export const countBodyImages = (node: JSONContent): number =>
  (node.type === 'image' ? 1 : 0) +
  (node.content?.reduce((count, child) => count + countBodyImages(child), 0) ?? 0);
