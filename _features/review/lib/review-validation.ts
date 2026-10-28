import type { ReviewFields } from './review-types';

export const isValidReviewRating = (rating: number): boolean =>
  Number.isFinite(rating) && rating >= 0 && rating <= 5;

export const hasRequiredReviewFields = (fields: ReviewFields): boolean =>
  fields.title.trim().length > 0 &&
  fields.product.trim().length > 0 &&
  Number.isSafeInteger(fields.category?.id) &&
  (fields.category?.id ?? 0) > 0 &&
  fields.duration.trim().length > 0 &&
  isValidReviewRating(fields.rating);
