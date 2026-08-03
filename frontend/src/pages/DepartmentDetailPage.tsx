import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, Users } from 'lucide-react';

import { DataTable } from '../components/data-table/data-table';
import { buildEmployeeColumns } from '../components/employees/employee-columns';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { useDepartment } from '../hooks/useDepartments';
import { useEmployees } from '../hooks/useEmployees';

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: department, isLoading, isError, error } = useDepartment(id);
  const { data: employees } = useEmployees();

  const departmentEmployees = useMemo(
    () => (employees ?? []).filter((employee) => employee.departmentId === id),
    [employees, id],
  );

  const columns = useMemo(() => buildEmployeeColumns({ canManage: false, onEdit: () => undefined, onDelete: () => undefined }), []);

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Manager</p>
              <p className="text-lg font-semibold text-foreground">{department.manager?.fullName ?? 'Unassigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open positions</p>
              <p className="text-lg font-semibold text-muted-foreground">Not tracked yet</p>
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
    </div>
  );
}
