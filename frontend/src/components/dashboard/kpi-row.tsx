import { CheckCircle2, Clock, UserCheck, Users, XCircle, Building2, UserPlus, CalendarClock, Bell } from 'lucide-react';

import { StatCard } from '../ui/stat-card';
import type { DashboardSummary } from '../../types';

export function KpiRow({ summary }: { summary: DashboardSummary }) {
  if (summary.scope === 'ORGANIZATION') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={summary.totalEmployees} icon={Users} />
        <StatCard label="Departments" value={summary.departmentsCount} icon={Building2} />
        <StatCard label="Active employees" value={summary.activeEmployees} icon={UserCheck} />
        <StatCard label="New employees" value={summary.newEmployees} icon={UserPlus} hint="Last 30 days" />
        <StatCard label="Pending leaves" value={summary.pendingLeaveRequests} icon={Clock} />
        <StatCard label="Approved leaves" value={summary.approvedLeaveRequests} icon={CheckCircle2} />
        <StatCard label="Rejected leaves" value={summary.rejectedLeaveRequests} icon={XCircle} />
        <StatCard label="Today's attendance" value="—" icon={CalendarClock} placeholder hint="Not tracked yet" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="My pending leave" value={summary.myPendingLeaveRequests} icon={Clock} />
      <StatCard label="My approved leave" value={summary.myApprovedLeaveRequests} icon={CheckCircle2} />
      <StatCard label="Unread notifications" value={summary.unreadNotifications} icon={Bell} />
    </div>
  );
}
