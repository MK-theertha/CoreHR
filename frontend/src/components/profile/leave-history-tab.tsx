import { CalendarDays } from 'lucide-react';

import { LeaveStatusBadge } from '../shared/status-badge';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';
import { formatShortDate } from '../../lib/format';
import type { LeaveRequest } from '../../types';

export function LeaveHistoryTab({ leaveRequests, isLoading }: { leaveRequests: LeaveRequest[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (leaveRequests.length === 0) {
    return <EmptyState icon={CalendarDays} title="No leave history" description="Leave requests will appear here once submitted." />;
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {leaveRequests.map((request) => (
        <div key={request.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{request.leaveType}</p>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(request.startDate)} – {formatShortDate(request.endDate)}
            </p>
          </div>
          <LeaveStatusBadge status={request.status} />
        </div>
      ))}
    </div>
  );
}
