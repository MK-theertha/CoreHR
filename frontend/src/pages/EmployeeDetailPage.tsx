import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ActivityTab } from '../components/profile/activity-tab';
import { DocumentsTab } from '../components/profile/documents-tab';
import { EmploymentTab } from '../components/profile/employment-tab';
import { LeaveHistoryTab } from '../components/profile/leave-history-tab';
import { NotesTab } from '../components/profile/notes-tab';
import { OverviewTab } from '../components/profile/overview-tab';
import { PersonalTab } from '../components/profile/personal-tab';
import { EmploymentStatusBadge } from '../components/shared/status-badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useEmployee } from '../hooks/useEmployees';
import { useLeaveRequests } from '../hooks/useLeave';
import { initials } from '../lib/format';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employee, isLoading, isError, error } = useEmployee(id);
  const { data: leaveRequests, isLoading: isLoadingLeave } = useLeaveRequests(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="People" title="Employee" />
        <ErrorBanner message={isError ? (error as Error).message : 'Employee not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} className="-ml-2 gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to employees
      </Button>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-xl">{initials(employee.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{employee.fullName}</h2>
              <EmploymentStatusBadge status={employee.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {employee.jobTitle ?? 'No title set'} {employee.department ? `· ${employee.department.name}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{employee.email}</span>
              {employee.phone ? <span>{employee.phone}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="leave">Leave History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab employee={employee} leaveRequests={leaveRequests ?? []} />
        </TabsContent>
        <TabsContent value="personal">
          <PersonalTab employee={employee} canEdit={false} />
        </TabsContent>
        <TabsContent value="employment">
          <EmploymentTab employee={employee} />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveHistoryTab leaveRequests={leaveRequests ?? []} isLoading={isLoadingLeave} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
