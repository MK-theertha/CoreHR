import { CalendarClock, CheckCircle2, Clock } from 'lucide-react';

import { StatCard } from '../ui/stat-card';
import { EmploymentStatusBadge } from '../shared/status-badge';
import type { Employee, LeaveRequest } from '../../types';
import { formatDate } from '../../lib/format';

function tenure(joiningDate: string | null) {
  if (!joiningDate) return '—';
  const start = new Date(joiningDate);
  const months = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} mo`;
  return `${years}y ${remMonths}mo`;
}

export function OverviewTab({ employee, leaveRequests }: { employee: Employee; leaveRequests: LeaveRequest[] }) {
  const pending = leaveRequests.filter((r) => r.status === 'PENDING').length;
  const approved = leaveRequests.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tenure" value={tenure(employee.joiningDate)} icon={CalendarClock} />
        <StatCard label="Pending leave" value={pending} icon={Clock} />
        <StatCard label="Approved leave" value={approved} icon={CheckCircle2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <div className="mt-2">
            <EmploymentStatusBadge status={employee.status} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</p>
          <p className="mt-2 text-sm text-foreground">{employee.department?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joined</p>
          <p className="mt-2 text-sm text-foreground">{formatDate(employee.joiningDate)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
          <p className="mt-2 text-sm text-foreground">{employee.email}</p>
        </div>
      </div>
    </div>
  );
}
