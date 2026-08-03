import { Bell, CheckCheck } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/cn';
import { timeAgo } from '../lib/format';
import type { Notification } from '../types';

function groupByRecency(notifications: Notification[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const notification of notifications) {
    const createdAt = new Date(notification.createdAt);
    if (createdAt >= startOfToday) {
      groups[0].items.push(notification);
    } else if (createdAt >= startOfYesterday) {
      groups[1].items.push(notification);
    } else {
      groups[2].items.push(notification);
    }
  }

  return groups.filter((group) => group.items.length > 0);
}

export default function NotificationsPage() {
  const { data: notifications, isLoading, isError, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((notification) => !notification.isRead).length ?? 0;
  const groups = useMemo(() => groupByRecency(notifications ?? []), [notifications]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.` : "You're all caught up."}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </Button>
          ) : null
        }
      />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You'll see updates about leave requests and account activity here." />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="space-y-3">
                {group.items.map((notification) => (
                  <Card
                    key={notification.id}
                    className={cn('p-5', !notification.isRead && 'border-primary/30 bg-primary/[0.03]')}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {!notification.isRead ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                          <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{timeAgo(notification.createdAt)}</span>
                        {!notification.isRead ? (
                          <button
                            onClick={() => markRead.mutate(notification.id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Mark as read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
