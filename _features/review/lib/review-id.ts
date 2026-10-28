export const isValidReviewId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[1-9]\d*$/.test(value) &&
  BigInt(value) <= BigInt('9223372036854775807');
