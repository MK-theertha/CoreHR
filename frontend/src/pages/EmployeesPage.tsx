import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, SlidersHorizontal, Trash2, UserPlus } from 'lucide-react';

import { useConfirm } from '../components/shared/confirm-dialog';
import { DataTable } from '../components/data-table/data-table';
import { buildEmployeeColumns } from '../components/employees/employee-columns';
import { EmployeeFormDialog } from '../components/employees/employee-form-dialog';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { useDepartments } from '../hooks/useDepartments';
import { useDeleteEmployee, useEmployees } from '../hooks/useEmployees';
import { buildCsv, downloadCsv } from '../lib/csv';
import type { Employee, EmploymentStatus } from '../types';

const statusOptions: EmploymentStatus[] = ['ACTIVE', 'PROBATION', 'INACTIVE', 'TERMINATED'];

export default function EmployeesPage() {
  const { user } = useAuth();
  const canManage = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: employees, isLoading, isError, error } = useEmployees();
  const { data: departments } = useDepartments();
  const deleteEmployee = useDeleteEmployee();
  const { confirm, dialog } = useConfirm();

  const [dialogState, setDialogState] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null });
  const [filterOpen, setFilterOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus[]>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((employee) => {
      const matchesDepartment = departmentFilter.length === 0 || (employee.departmentId && departmentFilter.includes(employee.departmentId));
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(employee.status);
      return matchesDepartment && matchesStatus;
    });
  }, [employees, departmentFilter, statusFilter]);

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

  const selectedIds = Object.keys(rowSelection).filter((id) => (rowSelection as Record<string, boolean>)[id]);

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: `Remove ${selectedIds.length} employee(s)?`,
      description: 'This permanently removes these employee records from the directory.',
      confirmLabel: 'Remove all',
      destructive: true,
    });

    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteEmployee.mutateAsync(id)));
      toast.success(`${selectedIds.length} employee(s) removed`);
      setRowSelection({});
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = () => {
    const rows = filteredEmployees.map((employee) => ({
      Name: employee.fullName,
      Email: employee.email,
      Department: employee.department?.name ?? '',
      Role: employee.jobTitle ?? '',
      Status: employee.status,
    }));

    downloadCsv(
      'employees.csv',
      buildCsv(rows, [
        { key: 'Name', header: 'Name' },
        { key: 'Email', header: 'Email' },
        { key: 'Department', header: 'Department' },
        { key: 'Role', header: 'Role' },
        { key: 'Status', header: 'Status' },
      ]),
    );
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Employee management"
        description="Browse, search, and manage your organization's workforce."
        actions={
          canManage ? (
            <Button onClick={() => setDialogState({ open: true, employee: null })}>
              <UserPlus className="h-4 w-4" /> Add employee
            </Button>
          ) : null
        }
      />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredEmployees}
          searchPlaceholder="Search by name or email..."
          initialGlobalFilter={searchParams.get('q') ?? ''}
          onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
          emptyState={
            <EmptyState icon={UserPlus} title="No employees found" description="Try adjusting your filters or add a new employee." />
          }
          toolbarExtra={
            <>
              {canManage && selectedIds.length > 0 ? (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isBulkDeleting} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  {isBulkDeleting ? 'Removing...' : `Remove (${selectedIds.length})`}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)} className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {departmentFilter.length + statusFilter.length > 0 ? ` (${departmentFilter.length + statusFilter.length})` : ''}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </>
          }
        />
      )}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter employees</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Department</p>
              <div className="space-y-2.5">
                {departments?.map((department) => (
                  <label key={department.id} className="flex items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={departmentFilter.includes(department.id)}
                      onCheckedChange={(checked) =>
                        setDepartmentFilter((prev) => (checked ? [...prev, department.id] : prev.filter((id) => id !== department.id)))
                      }
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Status</p>
              <div className="space-y-2.5">
                {statusOptions.map((status) => (
                  <label key={status} className="flex items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) =>
                        setStatusFilter((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)))
                      }
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDepartmentFilter([]);
                setStatusFilter([]);
              }}
            >
              Clear filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <EmployeeFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        editingEmployee={dialogState.employee}
      />

      {dialog}
    </div>
  );
}
