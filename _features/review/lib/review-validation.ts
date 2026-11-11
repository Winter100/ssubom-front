import type { ReviewFields } from './review-types';
import {
  MAX_TITLE_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_DURATION_LENGTH,
} from './review-limits';

export const isValidReviewRating = (rating: number): boolean =>
  Number.isFinite(rating) && rating >= 0 && rating <= 5;

export const hasRequiredReviewFields = (fields: ReviewFields): boolean =>
  fields.title.trim().length > 0 &&
  fields.title.length <= MAX_TITLE_LENGTH &&
  fields.product.trim().length > 0 &&
  fields.product.length <= MAX_PRODUCT_LENGTH &&
  Number.isSafeInteger(fields.category?.id) &&
  (fields.category?.id ?? 0) > 0 &&
  fields.duration.trim().length > 0 &&
  fields.duration.length <= MAX_DURATION_LENGTH &&
  isValidReviewRating(fields.rating);
