import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useMemo } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/cn';
import { navItems } from './nav-items';
import { SidebarNavItem } from './sidebar-nav-item';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const visibleNav = useMemo(() => navItems.filter((item) => item.roles.includes(user.role)), [user.role]);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-3 border-b border-border px-4 py-5', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">CH</div>
        {!collapsed ? (
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">CoreHR</p>
            <p className="text-xs text-muted-foreground">Workforce suite</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => (
          <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center px-2',
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </aside>
  );
}
