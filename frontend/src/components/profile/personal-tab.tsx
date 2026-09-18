import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { Employee } from '../../types';
import { Button } from '../ui/button';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';

const personalFormSchema = z.object({
  phone: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type PersonalFormValues = z.infer<typeof personalFormSchema>;

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function PersonalTab({
  employee,
  canEdit,
  onSave,
  isSaving,
  saveError,
}: {
  employee: Employee;
  canEdit: boolean;
  onSave?: (values: Partial<PersonalFormValues>) => Promise<void>;
  isSaving?: boolean;
  saveError?: Error | null;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset } = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    values: {
      phone: employee.phone ?? '',
      gender: employee.gender ?? '',
      dateOfBirth: toDateInputValue(employee.dateOfBirth),
    },
  });

  const onSubmit = async (values: PersonalFormValues) => {
    if (!onSave) return;
    await onSave({
      phone: values.phone || undefined,
      gender: values.gender || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
    });
    toast.success('Profile updated');
    setIsEditing(false);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Personal details</p>
        {canEdit && !isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5" type="button">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" htmlFor="phone">
          {isEditing ? (
            <Input id="phone" {...register('phone')} />
          ) : (
            <p className="text-sm text-foreground">{employee.phone ?? '—'}</p>
          )}
        </FormField>

        <FormField label="Gender" htmlFor="gender">
          {isEditing ? (
            <Input id="gender" {...register('gender')} />
          ) : (
            <p className="text-sm text-foreground">{employee.gender ?? '—'}</p>
          )}
        </FormField>

        <FormField label="Date of birth" htmlFor="dateOfBirth">
          {isEditing ? (
            <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
          ) : (
            <p className="text-sm text-foreground">{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'}</p>
          )}
        </FormField>
      </div>

      {saveError ? <ErrorBanner message={saveError.message} /> : null}

      {isEditing ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              reset();
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
