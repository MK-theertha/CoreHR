import { Badge } from '../ui/badge';

const employmentStatusVariant = {
  ACTIVE: 'success',
  PROBATION: 'warning',
  INACTIVE: 'secondary',
  TERMINATED: 'destructive',
} as const;

const leaveStatusVariant = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
} as const;

export function EmploymentStatusBadge({ status }: { status: keyof typeof employmentStatusVariant }) {
  return <Badge variant={employmentStatusVariant[status]}>{status}</Badge>;
}

export function LeaveStatusBadge({ status }: { status: keyof typeof leaveStatusVariant }) {
  return <Badge variant={leaveStatusVariant[status]}>{status}</Badge>;
}
