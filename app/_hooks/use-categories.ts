'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { categoryKeys } from '../_constant/query-keys';
import { api } from '@/lib/api';
import { apiPathCategory } from '../_constant/api-path';
import type { CategoryType } from '../_types/review';

const getCategoryList = () => {
  return api.get<CategoryType[]>(apiPathCategory.list);
};

export const useCategories = () => {
  return useSuspenseQuery({
    queryKey: [categoryKeys.list],
    queryFn: getCategoryList,
  });
};
