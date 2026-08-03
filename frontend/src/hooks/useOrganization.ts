import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Organization } from '../types';

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => authFetch<ApiResponse<Organization>>('/organization').then((res) => res.data),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string }) =>
      authFetch<ApiResponse<Organization>>('/organization', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization'] }),
  });
}
