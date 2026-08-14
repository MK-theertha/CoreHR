import { useQuery } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { AuditLogResponse } from '../types';

export function useAuditLog() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: () => authFetch<AuditLogResponse>('/audit?pageSize=100').then((res) => res.data),
  });
}
