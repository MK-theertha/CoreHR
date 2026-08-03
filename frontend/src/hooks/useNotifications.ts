import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Notification } from '../types';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => authFetch<ApiResponse<Notification[]>>('/notifications').then((res) => res.data),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      authFetch<ApiResponse<Notification>>(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authFetch<ApiResponse<{ message: string }>>('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
