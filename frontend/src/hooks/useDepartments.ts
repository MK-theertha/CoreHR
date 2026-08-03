import { useQuery } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { ApiResponse, Department } from '../types';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => authFetch<ApiResponse<Department[]>>('/departments').then((res) => res.data),
  });
}
