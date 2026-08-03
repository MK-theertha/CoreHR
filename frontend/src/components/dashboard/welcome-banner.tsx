import { BarChart3, Building2, CalendarPlus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { AppUser } from '../../types';
import { Button } from '../ui/button';

const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export function WelcomeBanner({ user }: { user: AppUser }) {
  const navigate = useNavigate();
  const canManageEmployees = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Overview</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{today}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManageEmployees ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/employees')} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Add employee
          </Button>
        ) : null}
        {canManageEmployees ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/departments')} className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Add department
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => navigate('/leave')} className="gap-1.5">
          <CalendarPlus className="h-3.5 w-3.5" /> Request leave
        </Button>
        {user.role === 'SUPER_ADMIN' ? (
          <Button size="sm" onClick={() => navigate('/reports')} className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> View reports
          </Button>
        ) : null}
      </div>
    </div>
  );
}
