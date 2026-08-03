import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function NotificationsPage() {
  const { data: notifications, isLoading, isError, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((notification) => !notification.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-corehr-600">Inbox</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h2>
        </div>
        {unreadCount > 0 ? (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </p>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-sm text-slate-500">Loading notifications...</p>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-5 shadow-sm ${
                notification.isRead ? 'border-slate-200 bg-white' : 'border-corehr-200 bg-corehr-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-corehr-600" /> : null}
                    <h3 className="text-lg font-semibold text-slate-900">{notification.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-medium text-slate-500">{timeAgo(notification.createdAt)}</span>
                  {!notification.isRead ? (
                    <button
                      onClick={() => markRead.mutate(notification.id)}
                      className="text-xs font-semibold text-corehr-600 hover:text-corehr-500"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-sm text-slate-500">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
