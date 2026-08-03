import { useMemo, useState } from 'react';
import { CalendarPlus, CalendarDays } from 'lucide-react';

import { DataTable } from '../components/data-table/data-table';
import { LeaveCalendar } from '../components/leave/leave-calendar';
import { buildLeaveColumns } from '../components/leave/leave-columns';
import { LeaveDecisionDialog, type LeaveDecision } from '../components/leave/leave-decision-dialog';
import { LeaveRequestDialog } from '../components/leave/leave-request-dialog';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBanner } from '../components/ui/error-banner';
import { PageHeader } from '../components/ui/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { StatCard } from '../components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../hooks/useAuth';
import { useCancelLeaveRequest, useLeaveRequests } from '../hooks/useLeave';
import type { LeaveRequest } from '../types';

export default function LeavePage() {
  const { user } = useAuth();
  const canDecide = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN' || user.role === 'MANAGER';
  const { data: leaveRequests, isLoading, isError, error } = useLeaveRequests();
  const cancelLeave = useCancelLeaveRequest();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [decision, setDecision] = useState<LeaveDecision>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const pendingCount = leaveRequests?.filter((request) => request.status === 'PENDING').length ?? 0;
  const approvedCount = leaveRequests?.filter((request) => request.status === 'APPROVED').length ?? 0;
  const totalCount = leaveRequests?.length ?? 0;

  const handleCancel = (request: LeaveRequest) => {
    setCancellingId(request.id);
    cancelLeave.mutate(request.id, { onSettled: () => setCancellingId(null) });
  };

  const columns = useMemo(
    () =>
      buildLeaveColumns({
        currentUserId: user.id,
        canDecide,
        onApprove: (request) => setDecision({ request, action: 'approve' }),
        onReject: (request) => setDecision({ request, action: 'reject' }),
        onCancel: handleCancel,
        busyId: cancellingId,
      }),
    [user.id, canDecide, cancellingId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time off"
        title="Leave management"
        description="Track, request, and approve time off across the organization."
        actions={
          <Button onClick={() => setRequestDialogOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> New request
          </Button>
        }
      />

      {isError ? <ErrorBanner message={(error as Error).message} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending review" value={pendingCount} />
        <StatCard label="Approved" value={approvedCount} />
        <StatCard label="Total requests" value={totalCount} />
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <DataTable
              columns={columns}
              data={leaveRequests ?? []}
              searchPlaceholder="Search by employee or type..."
              emptyState={<EmptyState icon={CalendarDays} title="No leave requests" description="Time off requests will show up here." />}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <LeaveCalendar requests={leaveRequests ?? []} />
          </TabsContent>
        </Tabs>
      )}

      <LeaveRequestDialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen} />
      <LeaveDecisionDialog decision={decision} onOpenChange={(open) => !open && setDecision(null)} />
    </div>
  );
}
