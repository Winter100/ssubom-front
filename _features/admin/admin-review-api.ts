import { apiPath } from '@/_constant/api-path';
import { api } from '@/_lib/api/api';
import type { ReviewsPage, ReviewSearchParams, ReviewType } from '@/_types/review';
import type { ReportType } from '@/_features/review/lib/review-report-api';
import { adminReviewKey } from '@/_features/review/constant/review.keys';

export type AdminReviewFilters = Pick<ReviewSearchParams, 'searchType' | 'categoryId'> & { query: string };
export type AdminReportType = ReportType & { active: boolean };
type NewReportType = Pick<ReportType, 'name' | 'displayOrder'>;
type ReviewReport = {
  id: number;
  reviewId: number;
  reviewTitle: string;
  author: ReviewType['author'];
  reporter: ReviewType['author'] | null;
  reportType: Pick<ReportType, 'id' | 'name'>;
  reason: string;
  createdAt: string;
};
type ReportPage = Omit<ReviewsPage, 'content'> & { content: ReviewReport[] };
type ReviewPage = Omit<ReviewsPage, 'content'> & {
  content: Pick<ReviewType, 'id' | 'title' | 'author' | 'category' | 'createdAt'>[];
};

export const adminReviewsKey = (memberId: number) => [...adminReviewKey, memberId, 'reviews'] as const;
export const adminReportsKey = (memberId: number) => [...adminReviewKey, memberId, 'reports'] as const;
export const adminTypesKey = (memberId: number) => [...adminReviewKey, memberId, 'types'] as const;

const size = 50;

export const adminReviewApi = {
  getReports: async (page: number, reviewId: number | undefined, signal: AbortSignal) =>
    (await api.get<ReportPage>(apiPath.adminReviewReports, { params: { page, size, reviewId }, signal })).data,
  getReviews: async (page: number, filters: AdminReviewFilters, signal: AbortSignal) => {
    const query = filters.query.trim();
    if (!query) throw new Error('검색어를 입력해 주세요.');
    return (await api.get<ReviewPage>(apiPath.adminReviews, { params: { page, size, ...filters, query }, signal })).data;
  },
  deleteReview: async (id: number, signal: AbortSignal): Promise<void> => {
    await api.delete<void>(`${apiPath.adminReviews}/${id}`, { signal });
  },
  getTypes: async (signal: AbortSignal) =>
    (await api.get<AdminReportType[]>(apiPath.adminReviewReportTypes, { signal })).data,
  createType: async (input: NewReportType, signal: AbortSignal) =>
    (await api.post<AdminReportType>(apiPath.adminReviewReportTypes, input, { signal })).data,
  updateType: async ({ id, ...input }: Omit<AdminReportType, 'displayOrder'>, signal: AbortSignal) =>
    (await api.put<AdminReportType>(`${apiPath.adminReviewReportTypes}/${id}`, input, { signal })).data,
  reorderTypes: async (reportTypeIds: number[], signal: AbortSignal) =>
    (await api.put<AdminReportType[]>(apiPath.adminReviewReportTypeOrder, { reportTypeIds }, { signal })).data,
};
