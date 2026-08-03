import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { navItems } from './nav-items';

const routeLabels: Record<string, string> = {
  employees: 'Employees',
  departments: 'Departments',
  leave: 'Leave',
  notifications: 'Notifications',
  reports: 'Reports',
  settings: 'Settings',
  profile: 'Profile',
  dashboard: 'Dashboard',
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const rootLabel = routeLabels[segments[0]] ?? navItems.find((item) => item.to === `/${segments[0]}`)?.label ?? segments[0];
  const isDetail = segments.length > 1;

  return (
    <nav className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
      <Link to={`/${segments[0]}`} className="font-medium text-foreground hover:text-primary">
        {rootLabel}
      </Link>
      {isDetail ? (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Detail</span>
        </>
      ) : null}
    </nav>
  );
}
