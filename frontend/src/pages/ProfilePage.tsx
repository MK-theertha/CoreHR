import { useEffect, useState } from 'react';

import { useMyProfile, useUpdateMyProfile } from '../hooks/useProfile';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export default function ProfilePage() {
  const { data: employee, isLoading, isError, error } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', gender: '', dateOfBirth: '' });

  useEffect(() => {
    if (employee) {
      setForm({
        phone: employee.phone ?? '',
        gender: employee.gender ?? '',
        dateOfBirth: toDateInputValue(employee.dateOfBirth),
      });
    }
  }, [employee]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading profile...</p>;
  }

  if (isError || !employee) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Profile</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Employee profile</h2>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {isError ? (error as Error).message : 'No employee profile is linked to this account.'}
        </p>
      </div>
    );
  }

  const handleSave = () => {
    updateProfile.mutate(
      { phone: form.phone || undefined, gender: form.gender || undefined, dateOfBirth: form.dateOfBirth || undefined },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Profile</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Employee profile</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-corehr-50 text-2xl font-bold text-corehr-600">
            {initials(employee.fullName)}
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900">{employee.fullName}</h3>
          <p className="text-sm text-slate-500">{employee.jobTitle ?? '—'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Details</h4>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="text-sm font-semibold text-corehr-600 hover:text-corehr-500">
                Edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</label>
              <p className="mt-2 text-sm text-slate-700">{employee.email}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Department</label>
              <p className="mt-2 text-sm text-slate-700">{employee.department?.name ?? '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</label>
              <p className="mt-2 text-sm text-slate-700">{employee.status}</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phone</label>
              {isEditing ? (
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-corehr-500"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-700">{employee.phone ?? '—'}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gender</label>
              {isEditing ? (
                <input
                  value={form.gender}
                  onChange={(event) => setForm({ ...form, gender: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-corehr-500"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-700">{employee.gender ?? '—'}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date of birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-corehr-500"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-700">
                  {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'}
                </p>
              )}
            </div>
          </div>

          {updateProfile.isError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(updateProfile.error as Error).message}
            </p>
          ) : null}

          {isEditing ? (
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="rounded-xl bg-corehr-600 px-4 py-2 text-sm font-semibold text-white hover:bg-corehr-500 disabled:opacity-60"
              >
                {updateProfile.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
