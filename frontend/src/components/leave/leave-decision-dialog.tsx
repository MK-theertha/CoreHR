import { useState } from 'react';
import { toast } from 'sonner';

import { useApproveLeaveRequest, useRejectLeaveRequest } from '../../hooks/useLeave';
import type { LeaveRequest } from '../../types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Textarea } from '../ui/textarea';

export type LeaveDecision = { request: LeaveRequest; action: 'approve' | 'reject' } | null;

export function LeaveDecisionDialog({ decision, onOpenChange }: { decision: LeaveDecision; onOpenChange: (open: boolean) => void }) {
  const [comments, setComments] = useState('');
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();

  const mutation = decision?.action === 'approve' ? approveLeave : rejectLeave;
  const isApprove = decision?.action === 'approve';

  const handleConfirm = () => {
    if (!decision) return;

    mutation.mutate(
      { id: decision.request.id, comments: comments || undefined },
      {
        onSuccess: () => {
          toast.success(isApprove ? 'Leave request approved' : 'Leave request rejected');
          setComments('');
          onOpenChange(false);
        },
        onError: (error) => toast.error((error as Error).message),
      },
    );
  };

  return (
    <Dialog
      open={!!decision}
      onOpenChange={(next) => {
        if (!next) setComments('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApprove ? 'Approve leave request' : 'Reject leave request'}</DialogTitle>
        </DialogHeader>

        {decision ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {decision.request.employee.fullName}'s {decision.request.leaveType.toLowerCase()} request.
            </p>

            <FormField label="Comments (optional)" htmlFor="comments">
              <Textarea
                id="comments"
                rows={3}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                placeholder="Add a note for the employee..."
              />
            </FormField>

            {mutation.isError ? <ErrorBanner message={(mutation.error as Error).message} /> : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={isApprove ? 'default' : 'destructive'} onClick={handleConfirm} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
