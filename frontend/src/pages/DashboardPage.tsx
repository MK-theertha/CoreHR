import { useAuth } from '../hooks/useAuth';
import { useDashboardSummary } from '../hooks/useDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading, isError, error } = useDashboardSummary();

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Overview</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Welcome back, {user.name.split(' ')[0]}</h2>
        </div>
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </p>
      ) : null}

      {isLoading || !summary ? (
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      ) : summary.scope === 'ORGANIZATION' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total employees</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalEmployees}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active employees</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.activeEmployees}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Pending approvals</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.pendingLeaveRequests}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Employees by department</h3>
            </div>
            {summary.departmentBreakdown.length > 0 ? (
              <div className="flex h-56 items-end gap-3">
                {summary.departmentBreakdown.map((department) => {
                  const maxCount = Math.max(...summary.departmentBreakdown.map((d) => d.employeeCount), 1);
                  const heightPct = Math.max((department.employeeCount / maxCount) * 100, 6);

                  return (
                    <div key={department.name} className="flex flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-semibold text-slate-600">{department.employeeCount}</span>
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-corehr-600 to-corehr-100"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs text-slate-500">{department.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No departments yet.</p>
            )}
          </div>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">My pending leave requests</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.myPendingLeaveRequests}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">My approved leave requests</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.myApprovedLeaveRequests}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unread notifications</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.unreadNotifications}</p>
          </div>
        </div>
      )}
    </div>
  );
}
