import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';
import { notificationService } from './notification.service';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const include = {
  employee: { select: { id: true, fullName: true, email: true, departmentId: true, userId: true } },
} as const;

const canManageLeave = (role: string) => ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(role);

export const leaveService = {
  async listForUser(user: { id: string; role: string }) {
    if (canManageLeave(user.role)) {
      return prisma.leaveRequest.findMany({ include, orderBy: { createdAt: 'desc' } });
    }

    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });

    if (!employee) {
      return [];
    }

    return prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(
    userId: string,
    payload: { leaveType: string; startDate: string; endDate: string; reason: string },
  ) {
    const employee = await prisma.employee.findUnique({ where: { userId } });

    if (!employee) {
      throw new AppError('No employee profile linked to this account', 404);
    }

    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    if (startDate > endDate) {
      throw new AppError('Start date must be before end date', 400);
    }

    return prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: payload.leaveType,
        startDate,
        endDate,
        reason: payload.reason,
        status: 'PENDING',
      },
      include,
    });
  },

  async decide(id: string, approverUserId: string, status: 'APPROVED' | 'REJECTED', comments?: string) {
    const leaveRequest = await prisma.leaveRequest.findUnique({ include, where: { id } });

    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    if (leaveRequest.status !== 'PENDING') {
      throw new AppError('Only pending leave requests can be decided', 400);
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, approvedBy: approverUserId, comments },
      include,
    });

    if (leaveRequest.employee.userId) {
      await notificationService.create({
        userId: leaveRequest.employee.userId,
        title: status === 'APPROVED' ? 'Leave request approved' : 'Leave request rejected',
        message: `Your ${leaveRequest.leaveType} request has been ${status.toLowerCase()}.${comments ? ` Comment: ${comments}` : ''}`,
        type: 'LEAVE',
      });
    }

    return updated;
  },

  async cancel(id: string, userId: string) {
    const employee = await prisma.employee.findUnique({ where: { userId } });

    if (!employee) {
      throw new AppError('No employee profile linked to this account', 404);
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!leaveRequest || leaveRequest.employeeId !== employee.id) {
      throw new AppError('Leave request not found', 404);
    }

    if (leaveRequest.status !== 'PENDING') {
      throw new AppError('Only pending leave requests can be cancelled', 400);
    }

    return prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' }, include });
  },
};
