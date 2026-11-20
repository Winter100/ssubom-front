import { apiPath } from '@/_constant/api-path';
import { api } from '@/_lib/api/api';

export type ReportType = {
  id: number;
  name: string;
  displayOrder: number;
};

export type ReportInput = {
  reportTypeId: number;
  reason: string;
};

export const getReportTypes = async (signal?: AbortSignal): Promise<ReportType[]> =>
  (await api.get<ReportType[]>(apiPath.reviewReportTypes, { signal })).data;

export const submitReport = async (id: string, input: ReportInput, signal: AbortSignal): Promise<void> => {
  await api.post<void>(`${apiPath.reviews}/${id}/reports`, input, { signal });
};

export const msUntilSeoulMidnight = (now: number): number => {
  const day = 24 * 60 * 60 * 1000;
  const seoulOffset = 9 * 60 * 60 * 1000;
  return day - ((now + seoulOffset) % day);
};
