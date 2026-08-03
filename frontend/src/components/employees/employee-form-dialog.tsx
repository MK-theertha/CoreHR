import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { useDepartments } from '../../hooks/useDepartments';
import { useCreateEmployee, useUpdateEmployee } from '../../hooks/useEmployees';
import type { Employee } from '../../types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const UNASSIGNED = '__unassigned__';

const employeeFormSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(120),
  email: z.email('Enter a valid email'),
  departmentId: z.string().optional(),
  jobTitle: z.string().max(80).optional(),
  status: z.enum(['ACTIVE', 'PROBATION', 'INACTIVE', 'TERMINATED']),
  phone: z.string().max(30).optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const emptyForm: EmployeeFormValues = {
  fullName: '',
  email: '',
  departmentId: UNASSIGNED,
  jobTitle: '',
  status: 'ACTIVE',
  phone: '',
};

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'TERMINATED', label: 'Terminated' },
] as const;

type EmployeeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEmployee: Employee | null;
};

export function EmployeeFormDialog({ open, onOpenChange, editingEmployee }: EmployeeFormDialogProps) {
  const { data: departments } = useDepartments();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isEditing = !!editingEmployee;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    values: editingEmployee
      ? {
          fullName: editingEmployee.fullName,
          email: editingEmployee.email,
          departmentId: editingEmployee.departmentId ?? UNASSIGNED,
          jobTitle: editingEmployee.jobTitle ?? '',
          status: editingEmployee.status,
          phone: editingEmployee.phone ?? '',
        }
      : emptyForm,
  });

  const mutation = isEditing ? updateEmployee : createEmployee;

  const onSubmit = (values: EmployeeFormValues) => {
    const payload = { ...values, departmentId: values.departmentId === UNASSIGNED ? null : values.departmentId };

    const action = isEditing
      ? updateEmployee.mutateAsync({ id: editingEmployee.id, payload })
      : createEmployee.mutateAsync(payload);

    action
      .then(() => {
        toast.success(isEditing ? 'Employee updated' : 'Employee added');
        reset(emptyForm);
        onOpenChange(false);
      })
      .catch((error: Error) => toast.error(error.message));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset(emptyForm);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit employee' : 'Add employee'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Full name" htmlFor="fullName" error={errors.fullName}>
            <Input id="fullName" {...register('fullName')} />
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" disabled={isEditing} {...register('email')} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Department" htmlFor="departmentId">
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="departmentId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {departments?.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Status" htmlFor="status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Job title" htmlFor="jobTitle">
              <Input id="jobTitle" {...register('jobTitle')} />
            </FormField>

            <FormField label="Phone" htmlFor="phone">
              <Input id="phone" {...register('phone')} />
            </FormField>
          </div>

          {mutation.isError ? <ErrorBanner message={(mutation.error as Error).message} /> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
