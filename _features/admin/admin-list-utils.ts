import { ApiError } from '@/_lib/api/api';

export const getAdminErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError && error.status === 403) {
    return '이 작업을 수행할 권한이 없습니다.';
  }
  return error instanceof Error ? error.message : fallback;
};

export const moveOrderedItem = <T,>(rows: T[], from: number, to: number): T[] => {
  if (from < 0 || to < 0 || from >= rows.length || to >= rows.length || from === to) return rows;
  const next = [...rows];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
