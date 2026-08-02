const stats = [
  { label: 'Total employees', value: '1,482', trend: '+8.4%' },
  { label: 'Active employees', value: '1,281', trend: '+5.1%' },
  { label: 'Pending approvals', value: '38', trend: '-2.9%' },
  { label: 'Expiring documents', value: '17', trend: 'Needs review' },
];

const chartBars = [42, 56, 38, 71, 49, 84, 68];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Overview</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Executive dashboard</h2>
        </div>
        <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Download report
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Employee distribution</h3>
            <span className="text-sm text-slate-500">Last 12 months</span>
          </div>
          <div className="flex h-56 items-end gap-3">
            {chartBars.map((height, index) => (
              <div key={index} className="flex-1">
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-corehr-600 to-corehr-100"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Compliance snapshot</h3>
          <ul className="mt-6 space-y-4">
            {[
              ['Documents current', '92%'],
              ['Visa & permit checks', '81%'],
              ['Training completion', '74%'],
            ].map(([label, value]) => (
              <li key={label}>
                <div className="mb-1 flex justify-between text-sm text-slate-600">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-corehr-600" style={{ width: value }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
