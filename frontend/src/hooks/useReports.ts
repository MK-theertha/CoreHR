import { useQuery } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, ReportsSummary } from '../types';

export function useReportsSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => authFetch<ApiResponse<ReportsSummary>>('/reports/summary').then((res) => res.data),
  });
}
