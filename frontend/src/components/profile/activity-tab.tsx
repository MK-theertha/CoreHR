import { Activity } from 'lucide-react';

import { useEmployeeActivity } from '../../hooks/useEmployeeActivity';
import { formatDate } from '../../lib/format';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';

function actionVariant(action: string) {
  if (action.endsWith('CREATED') || action.endsWith('APPROVED')) return 'success';
  if (action.endsWith('DELETED') || action.endsWith('REJECTED')) return 'destructive';
  if (action.endsWith('UPDATED') || action.endsWith('CHANGED') || action.endsWith('CANCELLED')) return 'warning';
  return 'secondary';
}

export function ActivityTab({ employeeId }: { employeeId: string }) {
  const { data: entries, isLoading } = useEmployeeActivity(employeeId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No recorded activity yet"
        description="Changes to this employee's record and leave requests will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <Badge variant={actionVariant(entry.action)}>{entry.action.replaceAll('_', ' ')}</Badge>
            {entry.user ? <span className="ml-2 text-sm text-muted-foreground">by {entry.user.name}</span> : null}
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
        </li>
      ))}
    </ul>
  );
}
