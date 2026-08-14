import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { Badge } from '../ui/badge';
import { formatDate } from '../../lib/format';
import type { AuditLogEntry } from '../../types';

function actionVariant(action: string) {
  if (action.endsWith('CREATED') || action.endsWith('APPROVED')) return 'success';
  if (action.endsWith('DELETED') || action.endsWith('REJECTED')) return 'destructive';
  if (action.endsWith('UPDATED') || action.endsWith('CHANGED') || action.endsWith('CANCELLED')) return 'warning';
  return 'secondary';
}

export const auditColumns: ColumnDef<AuditLogEntry, any>[] = [
  {
    id: 'timestamp',
    accessorKey: 'timestamp',
    header: ({ column }) => <DataTableColumnHeader column={column} title="When" />,
    cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(getValue<string>())}</span>,
  },
  {
    id: 'actor',
    accessorFn: (row) => `${row.user?.name ?? ''} ${row.user?.email ?? ''}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Actor" />,
    cell: ({ row }) =>
      row.original.user ? (
        <div>
          <p className="font-medium text-foreground">{row.original.user.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.user.email}</p>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">System</span>
      ),
  },
  {
    id: 'action',
    accessorKey: 'action',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
    cell: ({ getValue }) => <Badge variant={actionVariant(getValue<string>())}>{getValue<string>().replaceAll('_', ' ')}</Badge>,
  },
  {
    id: 'entity',
    accessorFn: (row) => `${row.entityType ?? ''} ${row.entityId ?? ''}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Entity" />,
    cell: ({ row }) =>
      row.original.entityType ? (
        <span className="text-sm">
          {row.original.entityType} <span className="text-muted-foreground">#{row.original.entityId?.slice(-8)}</span>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    id: 'metadata',
    header: () => <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Details</span>,
    cell: ({ row }) =>
      row.original.metadata ? (
        <span className="block max-w-xs truncate text-xs text-muted-foreground" title={JSON.stringify(row.original.metadata)}>
          {JSON.stringify(row.original.metadata)}
        </span>
      ) : null,
    enableSorting: false,
  },
];
