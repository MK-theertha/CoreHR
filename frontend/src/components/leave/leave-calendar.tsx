import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import type { LeaveRequest } from '../../types';
import { Button } from '../ui/button';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusDotClass: Record<LeaveRequest['status'], string> = {
  PENDING: 'bg-warning',
  APPROVED: 'bg-success',
  REJECTED: 'bg-destructive',
  CANCELLED: 'bg-muted-foreground',
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function LeaveCalendar({ requests }: { requests: LeaveRequest[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const requestsByDay = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();

    for (const request of requests) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
        const key = toDateKey(day);
        const existing = map.get(key) ?? [];
        existing.push(request);
        map.set(key, existing);
      }
    }

    return map;
  }, [requests]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = toDateKey(new Date());

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = toDateKey(date);
          const dayRequests = requestsByDay.get(key) ?? [];
          const isCurrentMonth = date.getMonth() === cursor.getMonth();
          const isToday = key === today;
          const visible = dayRequests.slice(0, 3);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[92px] border-b border-r border-border p-2 last:border-r-0',
                !isCurrentMonth && 'bg-muted/40 text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-1.5 space-y-1">
                {visible.map((request) => (
                  <div key={`${request.id}-${key}`} className="flex items-center gap-1.5 truncate text-[11px]">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass[request.status])} />
                    <span className="truncate text-foreground">{request.employee.fullName.split(' ')[0]}</span>
                  </div>
                ))}
                {dayRequests.length > visible.length ? (
                  <p className="text-[11px] text-muted-foreground">+{dayRequests.length - visible.length} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
