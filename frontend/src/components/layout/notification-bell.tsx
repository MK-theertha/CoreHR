import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useMarkNotificationRead, useNotifications } from '../../hooks/useNotifications';
import { timeAgo } from '../../lib/format';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  const preview = (notifications ?? []).slice(0, 5);
  const unreadCount = (notifications ?? []).filter((item) => !item.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {preview.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          preview.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex flex-col items-start gap-0.5 whitespace-normal"
              onSelect={() => {
                if (!item.isRead) markRead.mutate(item.id);
              }}
            >
              <div className="flex w-full items-center gap-2">
                {!item.isRead ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.message}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="justify-center text-sm font-medium text-primary">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
