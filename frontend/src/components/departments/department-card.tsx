import { Briefcase, Building2, Pencil, Trash2, Users } from 'lucide-react';

import type { Department } from '../../types';
import { DataTableRowActions } from '../data-table/data-table-row-actions';
import { Card } from '../ui/card';

type DepartmentCardProps = {
  department: Department;
  canManage: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DepartmentCard({ department, canManage, canDelete, onOpen, onEdit, onDelete }: DepartmentCardProps) {
  return (
    <Card className="cursor-pointer p-5 transition-shadow hover:shadow-md" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{department.name}</p>
            <p className="text-xs text-muted-foreground">
              {department.employeeCount} employee{department.employeeCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {canManage ? (
          <div onClick={(event) => event.stopPropagation()}>
            <DataTableRowActions
              actions={[
                { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: onEdit },
                ...(canDelete
                  ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, destructive: true, onSelect: onDelete }]
                  : []),
              ]}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Manager: {department.manager?.fullName ?? 'No manager assigned'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          <span>Open positions — not tracked yet</span>
        </div>
      </div>
    </Card>
  );
}
