import type { CategoryType } from '@/_types/review';
import type { ReviewFields } from './review-types';

export type ReviewDraft = ReviewFields & { body: string };
export const DRAFT_KEY = 'sseobom:review-draft:v1';

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= 10 &&
  value.every(
    (item: unknown) => typeof item === 'string' && item.length <= 200,
  );

const isDraftCategory = (value: unknown): value is CategoryType | null =>
  value === null ||
  (typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'category' in value &&
    typeof value.category === 'string');

export const parseDraft = (raw: string): ReviewDraft => {
  const value: unknown = JSON.parse(raw);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    value.title.length > 100 ||
    !('product' in value) ||
    typeof value.product !== 'string' ||
    value.product.length > 80 ||
    !('category' in value) ||
    !isDraftCategory(value.category) ||
    !('duration' in value) ||
    typeof value.duration !== 'string' ||
    value.duration.length > 30 ||
    !('rating' in value) ||
    typeof value.rating !== 'number' ||
    !Number.isFinite(value.rating) ||
    value.rating < 0 ||
    value.rating > 5 ||
    !('image' in value) ||
    typeof value.image !== 'string' ||
    (value.image !== '' &&
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
        value.image,
      )) ||
    !('pros' in value) ||
    !isStringList(value.pros) ||
    !('cons' in value) ||
    !isStringList(value.cons) ||
    !('verdict' in value) ||
    typeof value.verdict !== 'string' ||
    value.verdict.length > 1000 ||
    !('body' in value) ||
    typeof value.body !== 'string'
  ) {
    throw new Error('저장된 작성 내용을 읽을 수 없습니다.');
  }

  return {
    title: value.title,
    product: value.product,
    category: value.category,
    duration: value.duration,
    rating: value.rating,
    image: value.image,
    pros: value.pros,
    cons: value.cons,
    verdict: value.verdict,
    body: value.body,
  };
};
