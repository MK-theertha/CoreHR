import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/cn';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { navItems } from './nav-items';

type MobileSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const { user } = useAuth();
  const visibleNav = useMemo(() => navItems.filter((item) => item.roles.includes(user.role)), [user.role]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-4 py-5">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">CH</div>
            <div className="text-left">
              <p className="text-sm font-semibold leading-tight">CoreHR</p>
              <p className="text-xs font-normal text-muted-foreground">Workforce suite</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
