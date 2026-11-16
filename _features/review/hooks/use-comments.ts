import { useWithdrawal } from '@/_features/my/hooks/use-withdrawal';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { ApiError } from '@/_lib/api/api';
import type {
  CommentAction,
  CommentPage,
  ReviewComment,
} from '@/_types/comment';
import { commentKeys } from '../constant/comment.keys';
import { commentApi, COMMENT_PAGE_SIZE } from '../lib/comment-api';
import {
  updateCommentThreads,
  uniqueCommentThreads,
} from '../lib/comment-cache';

export const useComments = (reviewId: string) => {
  const list = useInfiniteQuery({
    queryKey: commentKeys.list(reviewId, COMMENT_PAGE_SIZE),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      commentApi.list(reviewId, pageParam, COMMENT_PAGE_SIZE, signal),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const { data: recent } = useQuery<ReviewComment[]>({
    queryKey: commentKeys.recent(reviewId),
    queryFn: () => [],
    initialData: [],
    enabled: false,
  });
  const threads = uniqueCommentThreads(
    list.data?.pages.flatMap(({ content }) => content) ?? [],
  );
  const loadedIds = new Set(threads.map(({ id }) => id));

  return {
    ...list,
    threads,
    recent: recent.filter(({ id }) => !loadedIds.has(id)),
  };
};

export const useCommentAction = (reviewId: string) => {
  const withdrawal = useWithdrawal();
  const client = useQueryClient();
  const refresh = (): void => {
    void client.invalidateQueries({ queryKey: commentKeys.lists(reviewId) });
  };
  return useMutation<ReviewComment | undefined, Error, CommentAction>({
    mutationFn: async (action) => {
      await withdrawal.assertAllowed();
      if (action.type === 'create') {
        return commentApi.create(reviewId, {
          content: action.content,
          parentId: action.parentId,
        });
      }
      if (action.type === 'update') {
        await commentApi.update(reviewId, action.commentId, action.content);
      } else {
        await commentApi.remove(reviewId, action.commentId);
      }
      return undefined;
    },
    onSuccess: async (created, action) => {
      await client.cancelQueries({ queryKey: commentKeys.lists(reviewId) });
      client.setQueryData<ReviewComment[]>(
        commentKeys.recent(reviewId),
        (old = []) => updateCommentThreads(old, action, created),
      );
      if (action.type !== 'create' || created?.parentId !== null) {
        client.setQueriesData<InfiniteData<CommentPage>>(
          { queryKey: commentKeys.lists(reviewId) },
          (old) =>
            old && {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                content: updateCommentThreads(page.content, action, created),
              })),
            },
        );
      }
      refresh();
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 409)
      )
        refresh();
    },
    retry: false,
    gcTime: 0,
  });
};
