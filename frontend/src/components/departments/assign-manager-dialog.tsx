import { useState } from 'react';
import { toast } from 'sonner';

import { useUpdateUserRole } from '../../hooks/useUsers';
import type { Department, Employee } from '../../types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const NONE = '__none__';

type AssignManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department;
  employees: Employee[];
};

export function AssignManagerDialog({ open, onOpenChange, department, employees }: AssignManagerDialogProps) {
  const updateUserRole = useUpdateUserRole();
  const currentManagerId = department.manager?.id ?? NONE;
  const [selected, setSelected] = useState(currentManagerId);
  const [error, setError] = useState<Error | null>(null);

  // Only employees with a linked login (userId) can hold a role at all, and
  // never SUPER_ADMIN/HR_ADMIN — this dialog patches a real role, and picking
  // an admin account here would silently demote it to MANAGER.
  const candidates = employees.filter(
    (employee) => employee.userId != null && (employee.role === 'EMPLOYEE' || employee.role === 'MANAGER'),
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(currentManagerId);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (selected === currentManagerId) {
      onOpenChange(false);
      return;
    }

    setError(null);
    try {
      const previousManager = employees.find((employee) => employee.id === currentManagerId);
      if (previousManager?.userId && currentManagerId !== NONE) {
        await updateUserRole.mutateAsync({ userId: previousManager.userId, role: 'EMPLOYEE' });
      }

      if (selected !== NONE) {
        const nextManager = employees.find((employee) => employee.id === selected);
        if (nextManager?.userId) {
          await updateUserRole.mutateAsync({ userId: nextManager.userId, role: 'MANAGER' });
        }
      }

      toast.success('Department manager updated');
      onOpenChange(false);
    } catch (err) {
      setError(err as Error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign manager — {department.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This changes the selected person's role app-wide (they gain manager permissions — approving leave,
            viewing org dashboards) — it isn't just a label on this department. The previous manager, if any, is
            demoted back to EMPLOYEE.
          </p>

          <FormField label="Manager" htmlFor="manager">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="manager">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— No manager —</SelectItem>
                {candidates.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.fullName} {employee.role === 'MANAGER' ? '(currently a manager elsewhere)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {error ? <ErrorBanner message={error.message} /> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={updateUserRole.isPending}>
              {updateUserRole.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
