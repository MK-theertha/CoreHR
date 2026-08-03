import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 px-1 py-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {selectedCount > 0 ? `${selectedCount} of ${totalCount} row(s) selected` : `${totalCount} row(s) total`}
      </p>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select value={String(table.getState().pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </p>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
