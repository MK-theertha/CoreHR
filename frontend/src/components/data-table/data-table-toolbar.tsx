import type { Table } from '@tanstack/react-table';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Search...',
  children,
}: {
  table: Table<TData>;
  searchPlaceholder?: string;
  children?: ReactNode;
}) {
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hideableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(event) => event.preventDefault()}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
