import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useCreateLeaveRequest } from '../../hooks/useLeave';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ErrorBanner } from '../ui/error-banner';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const leaveFormSchema = z
  .object({
    leaveType: z.string().min(2, 'Leave type is required').max(80),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(2, 'Reason is required').max(500),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

const leaveTypes = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave'];

export function LeaveRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createLeaveRequest = useCreateLeaveRequest();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { leaveType: 'Annual Leave', startDate: '', endDate: '', reason: '' },
  });

  const onSubmit = (values: LeaveFormValues) => {
    createLeaveRequest
      .mutateAsync(values)
      .then(() => {
        toast.success('Leave request submitted');
        reset();
        onOpenChange(false);
      })
      .catch((error: Error) => toast.error(error.message));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New leave request</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Leave type" htmlFor="leaveType">
            <Controller
              control={control}
              name="leaveType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="leaveType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start date" htmlFor="startDate" error={errors.startDate}>
              <Input id="startDate" type="date" {...register('startDate')} />
            </FormField>
            <FormField label="End date" htmlFor="endDate" error={errors.endDate}>
              <Input id="endDate" type="date" {...register('endDate')} />
            </FormField>
          </div>

          <FormField label="Reason" htmlFor="reason" error={errors.reason}>
            <Textarea id="reason" rows={3} {...register('reason')} />
          </FormField>

          {createLeaveRequest.isError ? <ErrorBanner message={(createLeaveRequest.error as Error).message} /> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLeaveRequest.isPending}>
              {createLeaveRequest.isPending ? 'Submitting...' : 'Submit request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
