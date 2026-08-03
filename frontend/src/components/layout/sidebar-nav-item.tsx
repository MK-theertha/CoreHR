import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { NavItem } from './nav-items';

export function SidebarNavItem({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const link = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </NavLink>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
