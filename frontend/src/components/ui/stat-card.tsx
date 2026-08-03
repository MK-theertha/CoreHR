import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card } from './card';

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  placeholder?: boolean;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, hint, placeholder, className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn('mt-2 text-3xl font-bold tracking-tight text-foreground', placeholder && 'text-muted-foreground')}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
