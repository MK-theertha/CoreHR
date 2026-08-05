import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Skeleton } from '../ui/skeleton';
import { TooltipProvider } from '../ui/tooltip';
import { MobileSidebar } from './mobile-sidebar';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const COLLAPSE_KEY = 'corehr-sidebar-collapsed';

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
