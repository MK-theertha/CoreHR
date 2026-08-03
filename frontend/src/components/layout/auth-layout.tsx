import type { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 font-bold backdrop-blur">CH</div>
          <span className="text-lg font-semibold">CoreHR</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Run HR operations with clarity and confidence.</h2>
          <p className="mt-4 text-sm text-primary-foreground/80">
            Employee records, leave management, and organization insights — all in one connected workspace.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} CoreHR. All rights reserved.</p>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
              CH
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
