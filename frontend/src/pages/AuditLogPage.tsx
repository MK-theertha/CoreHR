import { ScrollText } from 'lucide-react';

import { auditColumns } from '../components/audit/audit-columns';
import { DataTable } from '../components/data-table/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { useAuditLog } from '../hooks/useAudit';

export default function AuditLogPage() {
  const { data: entries, isLoading, isError, error } = useAuditLog();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Who changed what, and when, across employees, leave, and roles."
      />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <DataTable
          columns={auditColumns}
          data={entries ?? []}
          searchPlaceholder="Search by actor, action, or entity..."
          emptyState={<EmptyState icon={ScrollText} title="No activity yet" description="Changes to employees, leave, and roles will show up here." />}
        />
      )}
    </div>
  );
}
