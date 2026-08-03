import { useQuery } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, DashboardSummary } from '../types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => authFetch<ApiResponse<DashboardSummary>>('/dashboard/summary').then((res) => res.data),
  });
}
