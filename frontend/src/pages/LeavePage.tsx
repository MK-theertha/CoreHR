const leaveRequests = [
  { id: 'LR-4421', employee: 'Alicia Morgan', type: 'Annual Leave', dates: '10 Sep - 12 Sep', status: 'Pending' },
  { id: 'LR-4417', employee: 'Jatin Shah', type: 'Sick Leave', dates: '22 Aug - 24 Aug', status: 'Approved' },
  { id: 'LR-4396', employee: 'Leah Tran', type: 'Personal Leave', dates: '05 Aug - 07 Aug', status: 'Rejected' },
];

const statusStyles: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
};

export default function LeavePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Time off</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Leave management</h2>
        </div>
        <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
          New request
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Available</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">18 days</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Used this year</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">12 days</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending review</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">03</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Employee</span>
          <span>Type</span>
          <span>Dates</span>
          <span>Status</span>
        </div>

        {leaveRequests.map((request) => (
          <div key={request.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0">
            <div>
              <p className="font-semibold text-slate-900">{request.employee}</p>
              <p className="text-xs text-slate-500">{request.id}</p>
            </div>
            <span>{request.type}</span>
            <span>{request.dates}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[request.status]}`}>
              {request.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
