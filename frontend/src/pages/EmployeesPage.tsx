const employees = [
  { id: 'EMP-1001', name: 'Alicia Morgan', department: 'Engineering', jobTitle: 'Frontend Engineer', status: 'ACTIVE' },
  { id: 'EMP-1003', name: 'Jatin Shah', department: 'Finance', jobTitle: 'Accounting Lead', status: 'PROBATION' },
  { id: 'EMP-1012', name: 'Leah Tran', department: 'People Ops', jobTitle: 'HR Generalist', status: 'ACTIVE' },
  { id: 'EMP-1018', name: 'Ravi Menon', department: 'Sales', jobTitle: 'Regional Manager', status: 'INACTIVE' },
];

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PROBATION: 'bg-amber-50 text-amber-700',
  INACTIVE: 'bg-slate-200 text-slate-700',
};

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">People</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Employee management</h2>
        </div>
        <button className="rounded-xl bg-corehr-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-corehr-500">
          Add employee
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Employee</span>
          <span>Department</span>
          <span>Role</span>
          <span>Status</span>
        </div>

        {employees.map((employee) => (
          <div key={employee.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0">
            <div>
              <p className="font-semibold text-slate-900">{employee.name}</p>
              <p className="text-xs text-slate-500">{employee.id}</p>
            </div>
            <span>{employee.department}</span>
            <span>{employee.jobTitle}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[employee.status]}`}>
              {employee.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
