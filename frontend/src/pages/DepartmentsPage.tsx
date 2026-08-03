import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Plus } from 'lucide-react';

import { useConfirm } from '../components/shared/confirm-dialog';
import { DepartmentCard } from '../components/departments/department-card';
import { DepartmentFormDialog } from '../components/departments/department-form-dialog';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { useDeleteDepartment, useDepartments } from '../hooks/useDepartments';
import type { Department } from '../types';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';
  const canDelete = user.role === 'SUPER_ADMIN';

  const { data: departments, isLoading, isError, error } = useDepartments();
  const deleteDepartment = useDeleteDepartment();
  const { confirm, dialog } = useConfirm();

  const [dialogState, setDialogState] = useState<{ open: boolean; department: Department | null }>({ open: false, department: null });

  const handleDelete = async (department: Department) => {
    const confirmed = await confirm({
      title: `Delete ${department.name}?`,
      description: 'Employees in this department will become unassigned. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });

    if (!confirmed) return;

    deleteDepartment.mutate(department.id, {
      onSuccess: () => toast.success(`${department.name} deleted`),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization"
        title="Departments"
        description="See headcount and management structure across your organization."
        actions={
          canManage ? (
            <Button onClick={() => setDialogState({ open: true, department: null })}>
              <Plus className="h-4 w-4" /> Add department
            </Button>
          ) : null
        }
      />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : departments && departments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              canManage={canManage}
              canDelete={canDelete}
              onOpen={() => navigate(`/departments/${department.id}`)}
              onEdit={() => setDialogState({ open: true, department })}
              onDelete={() => handleDelete(department)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={Building2} title="No departments yet" description="Add your first department to start organizing employees." />
      )}

      <DepartmentFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        editingDepartment={dialogState.department}
      />

      {dialog}
    </div>
  );
}
