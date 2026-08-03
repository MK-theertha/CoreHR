import { Menu } from 'lucide-react';

import { Button } from '../ui/button';
import { Breadcrumbs } from './breadcrumbs';
import { NotificationBell } from './notification-bell';
import { SearchInput } from './search-input';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

type TopbarProps = {
  onOpenMobileNav: () => void;
};

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <SearchInput />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
