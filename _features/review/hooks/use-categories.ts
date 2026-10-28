'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import type { CategoryType } from '../../../_types/review';
import { apiPath } from '../../../_constant/api-path';
import { api } from '@/_lib/api/api';
import { reviewKeys } from '../constant/review.keys';

const getCategoryList = () => {
  return api.get<CategoryType[]>(apiPath.categories);
};

export const useCategories = () => {
  return useSuspenseQuery({
    queryKey: reviewKeys.categories(),
    queryFn: getCategoryList,
  });
};
