import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RecentActivityFeed } from '../components/dashboard/recent-activity-feed';
import { WelcomeBanner } from '../components/dashboard/welcome-banner';
import { KpiRow } from '../components/dashboard/kpi-row';
import { DistributionDonutChart } from '../components/charts/distribution-donut-chart';
import { EmployeeGrowthChart } from '../components/charts/employee-growth-chart';
import { LeaveTrendsChart } from '../components/charts/leave-trends-chart';
import { MonthlyHiringChart } from '../components/charts/monthly-hiring-chart';
import { ErrorBanner } from '../components/ui/error-banner';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { useDashboardActivity, useDashboardSummary, useDashboardTrends } from '../hooks/useDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const canViewOrgStats = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN' || user.role === 'MANAGER';
  const { data: summary, isLoading, isError, error } = useDashboardSummary();
  const { data: trends, isLoading: isLoadingTrends } = useDashboardTrends(canViewOrgStats);
  const { data: activity, isLoading: isLoadingActivity } = useDashboardActivity(canViewOrgStats);

  return (
    <div className="space-y-6">
      <WelcomeBanner user={user} />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading || !summary ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          <KpiRow summary={summary} />

          {summary.scope === 'ORGANIZATION' ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Employee growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTrends ? <Skeleton className="h-64 w-full" /> : <EmployeeGrowthChart data={trends?.employeeGrowth ?? []} />}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly hiring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTrends ? <Skeleton className="h-64 w-full" /> : <MonthlyHiringChart data={trends?.monthlyHiring ?? []} />}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Leave trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTrends ? <Skeleton className="h-64 w-full" /> : <LeaveTrendsChart data={trends?.leaveTrends ?? []} />}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Employees by department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.departmentBreakdown.length > 0 ? (
                      <DistributionDonutChart data={summary.departmentBreakdown.map((d) => ({ label: d.name, value: d.employeeCount }))} />
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">No departments yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <RecentActivityFeed items={activity ?? []} isLoading={isLoadingActivity} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
