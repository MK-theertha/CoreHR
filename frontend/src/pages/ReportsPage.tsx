import { ReportSection } from '../components/reports/report-section';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { useReportsSummary } from '../hooks/useReports';

export default function ReportsPage() {
  const { data: summary, isLoading, isError, error } = useReportsSummary();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Insights" title="Reports" description="Organization-wide breakdowns across employees, leave, and roles." />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading || !summary ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportSection
            title="Department breakdown"
            data={summary.departmentBreakdown.map((d) => ({ label: d.name, value: d.employeeCount }))}
          />
          <ReportSection
            title="Employees by status"
            data={summary.employeesByStatus.map((d) => ({ label: d.status, value: d.count }))}
          />
          <ReportSection
            title="Leave requests by status"
            data={summary.leaveRequestsByStatus.map((d) => ({ label: d.status, value: d.count }))}
          />
          <ReportSection title="Users by role" data={summary.usersByRole.map((d) => ({ label: d.role, value: d.count }))} />
        </div>
      )}
    </div>
  );
}
