import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export type RowAction = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

export function DataTableRowActions({ actions }: { actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(event) => event.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} destructive={action.destructive} onSelect={action.onSelect} className="gap-2">
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
