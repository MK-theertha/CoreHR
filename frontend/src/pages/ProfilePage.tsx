export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Profile</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Employee profile</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-corehr-50 text-2xl font-bold text-corehr-600">
            AM
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900">Alicia Morgan</h3>
          <p className="text-sm text-slate-500">Senior Frontend Engineer</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</label>
              <p className="mt-2 text-sm text-slate-700">alicia.morgan@corehr.dev</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Department</label>
              <p className="mt-2 text-sm text-slate-700">Engineering</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gender</label>
              <p className="mt-2 text-sm text-slate-700">Female</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</label>
              <p className="mt-2 text-sm text-slate-700">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
