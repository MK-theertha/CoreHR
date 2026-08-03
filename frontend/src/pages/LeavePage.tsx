import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '../hooks/useAuth';
import {
  useApproveLeaveRequest,
  useCancelLeaveRequest,
  useCreateLeaveRequest,
  useLeaveRequests,
  useRejectLeaveRequest,
} from '../hooks/useLeave';
import type { LeaveRequest } from '../types';

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

const leaveFormSchema = z
  .object({
    leaveType: z.string().min(2, 'Leave type is required').max(80),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(2, 'Reason is required').max(500),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function NewLeaveRequestModal({ onClose }: { onClose: () => void }) {
  const createLeaveRequest = useCreateLeaveRequest();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { leaveType: 'Annual Leave', startDate: '', endDate: '', reason: '' },
  });

  const onSubmit = (values: LeaveFormValues) => {
    createLeaveRequest.mutateAsync(values).then(onClose).catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">New leave request</h3>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Leave type</label>
            <select
              {...register('leaveType')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
            >
              <option>Annual Leave</option>
              <option>Sick Leave</option>
              <option>Personal Leave</option>
              <option>Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
              />
              {errors.startDate ? <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End date</label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
              />
              {errors.endDate ? <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p> : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
            <textarea
              {...register('reason')}
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-corehr-500"
            />
            {errors.reason ? <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p> : null}
          </div>

          {createLeaveRequest.isError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(createLeaveRequest.error as Error).message}
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
              disabled={createLeaveRequest.isPending}
              className="rounded-xl bg-corehr-600 px-4 py-2 text-sm font-semibold text-white hover:bg-corehr-500 disabled:opacity-60"
            >
              {createLeaveRequest.isPending ? 'Submitting...' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeavePage() {
  const { user } = useAuth();
  const canDecide = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN' || user.role === 'MANAGER';
  const { data: leaveRequests, isLoading, isError, error } = useLeaveRequests();
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();
  const cancelLeave = useCancelLeaveRequest();
  const [modalOpen, setModalOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const pendingCount = leaveRequests?.filter((request) => request.status === 'PENDING').length ?? 0;
  const approvedCount = leaveRequests?.filter((request) => request.status === 'APPROVED').length ?? 0;
  const totalCount = leaveRequests?.length ?? 0;

  const runAction = (request: LeaveRequest, action: 'approve' | 'reject' | 'cancel') => {
    setActingId(request.id);
    const settle = () => setActingId(null);

    if (action === 'approve') {
      approveLeave.mutate({ id: request.id }, { onSettled: settle });
    } else if (action === 'reject') {
      rejectLeave.mutate({ id: request.id }, { onSettled: settle });
    } else {
      cancelLeave.mutate(request.id, { onSettled: settle });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Time off</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Leave management</h2>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          New request
        </button>
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending review</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{approvedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total requests</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Employee</span>
          <span>Type</span>
          <span>Dates</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Loading leave requests...</p>
        ) : leaveRequests && leaveRequests.length > 0 ? (
          leaveRequests.map((request) => {
            const isOwn = request.employee.userId === user.id;
            const isPending = request.status === 'PENDING';
            const busy = actingId === request.id;

            return (
              <div
                key={request.id}
                className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0"
              >
                <div>
                  <p className="font-semibold text-slate-900">{request.employee.fullName}</p>
                  <p className="text-xs text-slate-500">{request.employee.email}</p>
                </div>
                <span>{request.leaveType}</span>
                <span>
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </span>
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[request.status]}`}>
                  {request.status}
                </span>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  {isPending && canDecide && !isOwn ? (
                    <>
                      <button
                        onClick={() => runAction(request, 'approve')}
                        disabled={busy}
                        className="text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => runAction(request, 'reject')}
                        disabled={busy}
                        className="text-rose-600 hover:text-rose-500 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {isPending && isOwn ? (
                    <button
                      onClick={() => runAction(request, 'cancel')}
                      disabled={busy}
                      className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No leave requests yet.</p>
        )}
      </div>

      {modalOpen ? <NewLeaveRequestModal onClose={() => setModalOpen(false)} /> : null}
    </div>
  );
}
