import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { Employee } from '../../types';
import { Button } from '../ui/button';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';

type PersonalFormValues = { phone: string; gender: string; dateOfBirth: string };

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
  const [form, setForm] = useState<PersonalFormValues>({
    phone: employee.phone ?? '',
    gender: employee.gender ?? '',
    dateOfBirth: toDateInputValue(employee.dateOfBirth),
  });

  useEffect(() => {
    setForm({
      phone: employee.phone ?? '',
      gender: employee.gender ?? '',
      dateOfBirth: toDateInputValue(employee.dateOfBirth),
    });
  }, [employee]);

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({
      phone: form.phone || undefined,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
    });
    toast.success('Profile updated');
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Personal details</p>
        {canEdit && !isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" htmlFor="phone">
          {isEditing ? (
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          ) : (
            <p className="text-sm text-foreground">{employee.phone ?? '—'}</p>
          )}
        </FormField>

        <FormField label="Gender" htmlFor="gender">
          {isEditing ? (
            <Input id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
          ) : (
            <p className="text-sm text-foreground">{employee.gender ?? '—'}</p>
          )}
        </FormField>

        <FormField label="Date of birth" htmlFor="dateOfBirth">
          {isEditing ? (
            <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          ) : (
            <p className="text-sm text-foreground">{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'}</p>
          )}
        </FormField>
      </div>

      {saveError ? <ErrorBanner message={saveError.message} /> : null}

      {isEditing ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
