import { CalendarCheck, History, UserPlus2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';
import { timeAgo } from '../../lib/format';
import type { ActivityItem } from '../../types';

export function RecentActivityFeed({ items, isLoading }: { items: ActivityItem[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={History} title="No recent activity" description="New hires and leave decisions will show up here." />
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {item.type === 'EMPLOYEE_CREATED' ? <UserPlus2 className="h-3.5 w-3.5" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
