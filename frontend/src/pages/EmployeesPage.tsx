import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useDepartments } from '../hooks/useDepartments';
import { useCreateEmployee, useDeleteEmployee, useEmployees, useUpdateEmployee } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth';
import type { Employee } from '../types';

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PROBATION: 'bg-amber-50 text-amber-700',
  INACTIVE: 'bg-slate-200 text-slate-700',
  TERMINATED: 'bg-rose-50 text-rose-700',
};

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
  departmentId: '',
  jobTitle: '',
  status: 'ACTIVE',
  phone: '',
};

function EmployeeFormModal({
  editingEmployee,
  onClose,
}: {
  editingEmployee: Employee | null;
  onClose: () => void;
}) {
  const { data: departments } = useDepartments();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isEditing = !!editingEmployee;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: editingEmployee
      ? {
          fullName: editingEmployee.fullName,
          email: editingEmployee.email,
          departmentId: editingEmployee.departmentId ?? '',
          jobTitle: editingEmployee.jobTitle ?? '',
          status: editingEmployee.status,
          phone: editingEmployee.phone ?? '',
        }
      : emptyForm,
  });

  const mutation = isEditing ? updateEmployee : createEmployee;

  const onSubmit = (values: EmployeeFormValues) => {
    const payload = { ...values, departmentId: values.departmentId || null };

    const action = isEditing
      ? updateEmployee.mutateAsync({ id: editingEmployee.id, payload })
      : createEmployee.mutateAsync(payload);

    action.then(onClose).catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{isEditing ? 'Edit employee' : 'Add employee'}</h3>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input
              {...register('fullName')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
            />
            {errors.fullName ? <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              {...register('email')}
              disabled={isEditing}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500 disabled:bg-slate-100"
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
              <select
                {...register('departmentId')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
              >
                <option value="">Unassigned</option>
                {departments?.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                {...register('status')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Job title</label>
              <input
                {...register('jobTitle')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input
                {...register('phone')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
              />
            </div>
          </div>

          {mutation.isError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(mutation.error as Error).message}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl bg-corehr-600 px-4 py-2 text-sm font-semibold text-white hover:bg-corehr-500 disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const canManage = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';
  const { data: employees, isLoading, isError, error } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const [modalState, setModalState] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (employee: Employee) => {
    if (!window.confirm(`Remove ${employee.fullName} from the directory?`)) {
      return;
    }

    setDeletingId(employee.id);
    deleteEmployee.mutate(employee.id, { onSettled: () => setDeletingId(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">People</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Employee management</h2>
        </div>
        {canManage ? (
          <button
            onClick={() => setModalState({ open: true, employee: null })}
            className="rounded-xl bg-corehr-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-corehr-500"
          >
            Add employee
          </button>
        ) : null}
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className={`grid gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 ${
            canManage ? 'grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]' : 'grid-cols-[1.2fr_1fr_1fr_0.8fr]'
          }`}
        >
          <span>Employee</span>
          <span>Department</span>
          <span>Role</span>
          <span>Status</span>
          {canManage ? <span>Actions</span> : null}
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Loading employees...</p>
        ) : employees && employees.length > 0 ? (
          employees.map((employee) => (
            <div
              key={employee.id}
              className={`grid gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0 ${
                canManage ? 'grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]' : 'grid-cols-[1.2fr_1fr_1fr_0.8fr]'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-900">{employee.fullName}</p>
                <p className="text-xs text-slate-500">{employee.email}</p>
              </div>
              <span>{employee.department?.name ?? '—'}</span>
              <span>{employee.jobTitle ?? '—'}</span>
              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[employee.status]}`}>
                {employee.status}
              </span>
              {canManage ? (
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button
                    onClick={() => setModalState({ open: true, employee })}
                    className="text-corehr-600 hover:text-corehr-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    disabled={deletingId === employee.id}
                    className="text-rose-600 hover:text-rose-500 disabled:opacity-50"
                  >
                    {deletingId === employee.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No employees yet.</p>
        )}
      </div>

      {modalState.open ? (
        <EmployeeFormModal
          editingEmployee={modalState.employee}
          onClose={() => setModalState({ open: false, employee: null })}
        />
      ) : null}
    </div>
  );
}
