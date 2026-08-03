import { useQuery } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ActivityItem, ApiResponse, DashboardSummary, DashboardTrends } from '../types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => authFetch<ApiResponse<DashboardSummary>>('/dashboard/summary').then((res) => res.data),
  });
}

export function useDashboardTrends(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => authFetch<ApiResponse<DashboardTrends>>('/dashboard/trends').then((res) => res.data),
    enabled,
  });
}

export function useDashboardActivity(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => authFetch<ApiResponse<ActivityItem[]>>('/dashboard/activity').then((res) => res.data),
    enabled,
  });
}
