import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase, Building2, UserCog, Users } from 'lucide-react';

import { AssignManagerDialog } from '../components/departments/assign-manager-dialog';
import { DataTable } from '../components/data-table/data-table';
import { buildEmployeeColumns } from '../components/employees/employee-columns';
import { EmployeeFormDialog } from '../components/employees/employee-form-dialog';
import { useConfirm } from '../components/shared/confirm-dialog';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { useDepartment } from '../hooks/useDepartments';
import { useDeleteEmployee, useEmployees } from '../hooks/useEmployees';
import type { Employee } from '../types';

const ADMIN_ROLES = ['SUPER_ADMIN', 'HR_ADMIN'];

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = ADMIN_ROLES.includes(user.role);
  const canAssignManager = user.role === 'SUPER_ADMIN';
  const { data: department, isLoading, isError, error } = useDepartment(id);
  const { data: employees } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const { confirm, dialog } = useConfirm();
  const [dialogState, setDialogState] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  });
  const [assignManagerOpen, setAssignManagerOpen] = useState(false);

  const departmentEmployees = useMemo(
    () => (employees ?? []).filter((employee) => employee.departmentId === id),
    [employees, id],
  );

  const handleDelete = async (employee: Employee) => {
    const confirmed = await confirm({
      title: `Remove ${employee.fullName}?`,
      description: 'This permanently removes the employee record from the directory.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;

    deleteEmployee.mutate(employee.id, {
      onSuccess: () => toast.success(`${employee.fullName} removed`),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  const columns = useMemo(
    () =>
      buildEmployeeColumns({
        canManage,
        onEdit: (employee) => setDialogState({ open: true, employee }),
        onDelete: handleDelete,
      }),
    [canManage],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !department) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Organization" title="Department" />
        <ErrorBanner message={isError ? (error as Error).message : 'Department not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/departments')} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to departments
      </Button>

      <PageHeader eyebrow="Organization" title={department.name} />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-lg font-semibold text-foreground">{department.employeeCount}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Manager</p>
                <p className="text-lg font-semibold text-foreground">{department.manager?.fullName ?? 'Unassigned'}</p>
              </div>
            </div>
            {canAssignManager ? (
              <Button variant="ghost" size="icon" aria-label="Assign manager" onClick={() => setAssignManagerOpen(true)}>
                <UserCog className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open positions</p>
              <p className="text-lg font-semibold text-foreground">
                {department.openPositions ?? 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={departmentEmployees}
        searchPlaceholder="Search employees in this department..."
        onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
        emptyState={<EmptyState icon={Users} title="No employees in this department" />}
      />

      {canManage ? (
        <EmployeeFormDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
          editingEmployee={dialogState.employee}
        />
      ) : null}

      {canAssignManager ? (
        <AssignManagerDialog
          open={assignManagerOpen}
          onOpenChange={setAssignManagerOpen}
          department={department}
          employees={departmentEmployees}
        />
      ) : null}

      {dialog}
    </div>
  );
}
