import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Employee } from '../types';

export type ProfileUpdateInput = {
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
};

export function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => authFetch<ApiResponse<Employee>>('/employees/me').then((res) => res.data),
    retry: false,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileUpdateInput) =>
      authFetch<ApiResponse<Employee>>('/employees/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
  });
}
