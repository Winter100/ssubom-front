export const commentKeys = {
  lists: (reviewId: string) => ['comments', reviewId, 'list'] as const,
  list: (reviewId: string, size: number) => [...commentKeys.lists(reviewId), size] as const,
  recent: (reviewId: string) => ['comments', reviewId, 'recent'] as const,
};
