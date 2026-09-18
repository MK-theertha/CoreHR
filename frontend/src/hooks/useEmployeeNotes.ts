import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Note } from '../types';

export function useEmployeeNotes(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employees', employeeId, 'notes'],
    queryFn: () => authFetch<ApiResponse<Note[]>>(`/employees/${employeeId}/notes`).then((res) => res.data),
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeNote(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['employees', employeeId, 'notes'];

  return useMutation({
    mutationFn: (body: string) =>
      authFetch<ApiResponse<Note>>(`/employees/${employeeId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateEmployeeNote(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['employees', employeeId, 'notes'];

  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
      authFetch<ApiResponse<Note>>(`/employees/${employeeId}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteEmployeeNote(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['employees', employeeId, 'notes'];

  return useMutation({
    mutationFn: (noteId: string) =>
      authFetch<ApiResponse<null>>(`/employees/${employeeId}/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
