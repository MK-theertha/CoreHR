import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8 gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      {sorted === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : sorted === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />}
    </Button>
  );
}
