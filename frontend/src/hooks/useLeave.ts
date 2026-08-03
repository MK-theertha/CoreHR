import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, LeaveRequest } from '../types';

export type LeaveRequestInput = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

function useInvalidateLeave() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['leave'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
}

export function useLeaveRequests(employeeId?: string) {
  return useQuery({
    queryKey: ['leave', employeeId ?? 'all'],
    queryFn: () =>
      authFetch<ApiResponse<LeaveRequest[]>>(`/leave${employeeId ? `?employeeId=${employeeId}` : ''}`).then((res) => res.data),
  });
}

export function useCreateLeaveRequest() {
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: (payload: LeaveRequestInput) =>
      authFetch<ApiResponse<LeaveRequest>>('/leave', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  });
}

export function useApproveLeaveRequest() {
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      authFetch<ApiResponse<LeaveRequest>>(`/leave/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ comments }),
      }),
    onSuccess: invalidate,
  });
}

export function useRejectLeaveRequest() {
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      authFetch<ApiResponse<LeaveRequest>>(`/leave/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ comments }),
      }),
    onSuccess: invalidate,
  });
}

export function useCancelLeaveRequest() {
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: (id: string) =>
      authFetch<ApiResponse<LeaveRequest>>(`/leave/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: invalidate,
  });
}
