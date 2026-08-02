const notifications = [
  { title: 'Leave approved', detail: 'Your annual leave request was approved by your manager. ', time: '2 hours ago' },
  { title: 'Compliance reminder', detail: 'Passport renewal is due in 18 days.', time: 'Yesterday' },
  { title: 'Team update', detail: 'Three new hires were added to Engineering this week.', time: '3 days ago' },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Inbox</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h2>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{notification.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{notification.detail}</p>
              </div>
              <span className="text-xs font-medium text-slate-500">{notification.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
