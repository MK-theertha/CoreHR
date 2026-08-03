import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useCreateDepartment, useUpdateDepartment } from '../../hooks/useDepartments';
import type { Department } from '../../types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';

const departmentFormSchema = z.object({
  name: z.string().min(2, 'Name is required').max(80),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

type DepartmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDepartment: Department | null;
};

export function DepartmentFormDialog({ open, onOpenChange, editingDepartment }: DepartmentFormDialogProps) {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const isEditing = !!editingDepartment;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    values: { name: editingDepartment?.name ?? '' },
  });

  const mutation = isEditing ? updateDepartment : createDepartment;

  const onSubmit = (values: DepartmentFormValues) => {
    const action = isEditing
      ? updateDepartment.mutateAsync({ id: editingDepartment.id, payload: values })
      : createDepartment.mutateAsync(values);

    action
      .then(() => {
        toast.success(isEditing ? 'Department updated' : 'Department created');
        reset();
        onOpenChange(false);
      })
      .catch((error: Error) => toast.error(error.message));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit department' : 'Add department'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Department name" htmlFor="name" error={errors.name}>
            <Input id="name" {...register('name')} />
          </FormField>

          {mutation.isError ? <ErrorBanner message={(mutation.error as Error).message} /> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
