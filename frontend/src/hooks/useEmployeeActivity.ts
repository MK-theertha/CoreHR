import { useQuery } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import type { AuditLogResponse } from '../types';

export function useEmployeeActivity(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employees', employeeId, 'activity'],
    queryFn: () =>
      authFetch<AuditLogResponse>(`/employees/${employeeId}/activity?pageSize=25`).then((res) => res.data),
    enabled: !!employeeId,
  });
}
