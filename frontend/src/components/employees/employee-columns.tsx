import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, UserRound } from 'lucide-react';

import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { DataTableRowActions } from '../data-table/data-table-row-actions';
import { EmploymentStatusBadge } from '../shared/status-badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import type { Employee } from '../../types';
import { initials } from '../../lib/format';

export function buildEmployeeColumns({
  canManage,
  onEdit,
  onDelete,
}: {
  canManage: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}): ColumnDef<Employee, any>[] {
  const columns: ColumnDef<Employee, any>[] = [];

  if (canManage) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
      ),
      enableSorting: false,
      enableHiding: false,
    });
  }

  columns.push(
    {
      id: 'employee',
      accessorFn: (row) => `${row.fullName} ${row.email}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {row.original.fullName ? initials(row.original.fullName) : <UserRound className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.original.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'department',
      accessorFn: (row) => row.department?.name ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      id: 'jobTitle',
      accessorFn: (row) => row.jobTitle ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ getValue }) => <EmploymentStatusBadge status={getValue<Employee['status']>()} />,
    },
  );

  if (canManage) {
    columns.push({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DataTableRowActions
          actions={[
            { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => onEdit(row.original) },
            { label: 'Remove', icon: <Trash2 className="h-4 w-4" />, destructive: true, onSelect: () => onDelete(row.original) },
          ]}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    });
  }

  return columns;
}
