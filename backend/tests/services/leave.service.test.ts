import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../src/config/prisma';
import { leaveService } from '../../src/services/leave.service';
import { notificationService } from '../../src/services/notification.service';
import { AppError } from '../../src/utils/appError';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    leaveRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/notification.service', () => ({
  notificationService: {
    create: vi.fn(),
  },
}));

const findUnique = prisma.leaveRequest.findUnique as ReturnType<typeof vi.fn>;
const update = prisma.leaveRequest.update as ReturnType<typeof vi.fn>;
const notify = notificationService.create as ReturnType<typeof vi.fn>;

const pendingRequestFor = (employeeUserId: string | null) => ({
  id: 'leave-1',
  status: 'PENDING',
  leaveType: 'Sick Leave',
  employee: { id: 'emp-1', fullName: 'Jane Doe', email: 'jane@corehr.dev', departmentId: 'dept-1', userId: employeeUserId },
});

describe('leaveService.decide — self-approval guard', () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    notify.mockReset();
  });

  it('rejects with 403 when the approver is the same user as the leave request owner', async () => {
    findUnique.mockResolvedValue(pendingRequestFor('user-42'));

    await expect(leaveService.decide('leave-1', 'user-42', 'APPROVED')).rejects.toMatchObject({
      message: 'You cannot approve or reject your own leave request',
      statusCode: 403,
    });

    expect(update).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('rejects with 403 for self-rejection too, not just self-approval', async () => {
    findUnique.mockResolvedValue(pendingRequestFor('user-42'));

    await expect(leaveService.decide('leave-1', 'user-42', 'REJECTED')).rejects.toBeInstanceOf(AppError);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows a different approver to approve the request', async () => {
    findUnique.mockResolvedValue(pendingRequestFor('user-42'));
    update.mockResolvedValue({ ...pendingRequestFor('user-42'), status: 'APPROVED', approvedBy: 'manager-7' });

    const result = await leaveService.decide('leave-1', 'manager-7', 'APPROVED');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'leave-1' },
      data: { status: 'APPROVED', approvedBy: 'manager-7', comments: undefined },
      include: expect.anything(),
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('APPROVED');
  });

  it('rejects with 404 when the leave request does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(leaveService.decide('missing-id', 'manager-7', 'APPROVED')).rejects.toMatchObject({
      message: 'Leave request not found',
      statusCode: 404,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects with 400 when the leave request is no longer pending', async () => {
    findUnique.mockResolvedValue({ ...pendingRequestFor('user-42'), status: 'APPROVED' });

    await expect(leaveService.decide('leave-1', 'manager-7', 'APPROVED')).rejects.toMatchObject({
      message: 'Only pending leave requests can be decided',
      statusCode: 400,
    });
    expect(update).not.toHaveBeenCalled();
  });
});
