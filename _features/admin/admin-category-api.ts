import { apiPath } from '@/_constant/api-path';
import { adminReviewKey } from '@/_features/review/constant/review.keys';
import { api } from '@/_lib/api/api';
import type { CategoryType } from '@/_types/review';

export const adminCategoriesKey = (memberId: number) =>
  [...adminReviewKey, memberId, 'categories'] as const;

export type CategoryAction =
  | { type: 'create'; category: string }
  | { type: 'rename'; id: number; category: string }
  | { type: 'delete'; id: number }
  | { type: 'reorder'; categoryIds: number[] };

export const getAdminCategories = async (
  signal: AbortSignal,
): Promise<CategoryType[]> =>
  (await api.get<CategoryType[]>(apiPath.adminCategories, { signal })).data;

export const changeAdminCategories = async (
  action: CategoryAction,
  signal: AbortSignal,
): Promise<CategoryType[] | undefined> => {
  switch (action.type) {
    case 'create':
      await api.post<CategoryType>(
        apiPath.adminCategories,
        { category: action.category },
        { signal },
      );
      return;
    case 'rename':
      await api.patch<CategoryType>(
        `${apiPath.adminCategories}/${action.id}`,
        { category: action.category },
        { signal },
      );
      return;
    case 'delete':
      await api.delete<void>(`${apiPath.adminCategories}/${action.id}`, {
        signal,
      });
      return;
    case 'reorder':
      return (
        await api.put<CategoryType[]>(
          apiPath.adminCategoryOrder,
          { categoryIds: action.categoryIds },
          { signal },
        )
      ).data;
  }
};
