'use client';

import { skipToken, useQuery } from '@tanstack/react-query';
import { categoryKeys } from '../_constant/query-keys';
import { api } from '@/lib/api';
import { apiPathCategory } from '../_constant/api-path';
import type { CategoryType } from '../_types/review';

export const useCategories = () => {
  return useQuery({
    queryKey: [categoryKeys.list],
    queryFn: apiPathCategory.list
      ? async ({ signal }): Promise<CategoryType[]> => {
          const { data } = await api.get<CategoryType[]>(apiPathCategory.list, {
            signal,
          });
          return data;
        }
      : skipToken,
  });
};
