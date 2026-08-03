import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Employee, EmploymentStatus } from '../types';

export type EmployeeFormInput = {
  fullName: string;
  email: string;
  departmentId?: string | null;
  jobTitle?: string;
  status: EmploymentStatus;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  joiningDate?: string;
};

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => authFetch<ApiResponse<Employee[]>>('/employees').then((res) => res.data),
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => authFetch<ApiResponse<Employee>>(`/employees/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmployeeFormInput) =>
      authFetch<ApiResponse<Employee>>('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<EmployeeFormInput> }) =>
      authFetch<ApiResponse<Employee>>(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => authFetch<ApiResponse<Employee>>(`/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
