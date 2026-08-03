import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Department } from '../types';

export type DepartmentInput = { name: string };

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => authFetch<ApiResponse<Department[]>>('/departments').then((res) => res.data),
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => authFetch<ApiResponse<Department>>(`/departments/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DepartmentInput) =>
      authFetch<ApiResponse<Department>>('/departments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentInput }) =>
      authFetch<ApiResponse<Department>>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => authFetch<ApiResponse<Department>>(`/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
