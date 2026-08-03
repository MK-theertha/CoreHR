export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function formatMonth(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function timeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
