import type { Employee } from '../../types';
import { EmploymentStatusBadge } from '../shared/status-badge';
import { formatDate } from '../../lib/format';

export function EmploymentTab({ employee }: { employee: Employee }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job title</p>
        <p className="mt-2 text-sm text-foreground">{employee.jobTitle ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</p>
        <p className="mt-2 text-sm text-foreground">{employee.department?.name ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
        <div className="mt-2">
          <EmploymentStatusBadge status={employee.status} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joining date</p>
        <p className="mt-2 text-sm text-foreground">{formatDate(employee.joiningDate)}</p>
      </div>
    </div>
  );
}
