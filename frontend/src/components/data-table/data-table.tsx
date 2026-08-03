import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { cn } from '../../lib/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';

type DataTableProps<TData> = {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  toolbarExtra?: ReactNode;
  onRowClick?: (row: TData) => void;
  emptyState?: ReactNode;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  getRowId?: (row: TData) => string;
  initialGlobalFilter?: string;
};

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder,
  toolbarExtra,
  onRowClick,
  emptyState,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  initialGlobalFilter = '',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getRowId: getRowId as any,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      rowSelection: rowSelection ?? internalSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection ?? internalSelection) : updater;
      onRowSelectionChange?.(next);
      setInternalSelection(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} searchPlaceholder={searchPlaceholder}>
        {toolbarExtra}
      </DataTableToolbar>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(event) => cell.column.id === 'select' && event.stopPropagation()}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  {emptyState ?? <span className="text-sm text-muted-foreground">No results.</span>}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
