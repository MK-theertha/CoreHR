import type { ColumnDef } from '@tanstack/react-table';
import { Check, X, XCircle } from 'lucide-react';

import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { LeaveStatusBadge } from '../shared/status-badge';
import { Button } from '../ui/button';
import { formatShortDate } from '../../lib/format';
import type { LeaveRequest } from '../../types';

export function buildLeaveColumns({
  currentUserId,
  canDecide,
  onApprove,
  onReject,
  onCancel,
  busyId,
}: {
  currentUserId: string;
  canDecide: boolean;
  onApprove: (request: LeaveRequest) => void;
  onReject: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
  busyId: string | null;
}): ColumnDef<LeaveRequest, any>[] {
  return [
    {
      id: 'employee',
      accessorFn: (row) => `${row.employee.fullName} ${row.employee.email}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.employee.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.original.employee.email}</p>
        </div>
      ),
    },
    {
      id: 'leaveType',
      accessorKey: 'leaveType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      id: 'dates',
      accessorFn: (row) => `${row.startDate} ${row.endDate}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {formatShortDate(row.original.startDate)} – {formatShortDate(row.original.endDate)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ getValue }) => <LeaveStatusBadge status={getValue<LeaveRequest['status']>()} />,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const request = row.original;
        const isOwn = request.employee.userId === currentUserId;
        const isPending = request.status === 'PENDING';
        const busy = busyId === request.id;

        if (isPending && canDecide && !isOwn) {
          return (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 gap-1 text-success" disabled={busy} onClick={() => onApprove(request)}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-destructive" disabled={busy} onClick={() => onReject(request)}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          );
        }

        if (isPending && isOwn) {
          return (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" disabled={busy} onClick={() => onCancel(request)}>
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          );
        }

        return null;
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
