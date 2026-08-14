import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';
import { auditService } from './audit.service';

export type Actor = { userId: string; ipAddress?: string | null };

export type EmployeeStatus = 'ACTIVE' | 'PROBATION' | 'INACTIVE' | 'TERMINATED';

export type EmployeeInput = {
  fullName: string;
  email: string;
  departmentId?: string | null;
  jobTitle?: string;
  status?: EmployeeStatus;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  joiningDate?: string;
};

const include = { department: true } as const;

export const employeeService = {
  async list(requestingUser: { id: string; role: string }) {
    if (requestingUser.role === 'MANAGER') {
      const managerEmployee = await prisma.employee.findUnique({ where: { userId: requestingUser.id } });

      if (!managerEmployee?.departmentId) {
        return [];
      }

      return prisma.employee.findMany({
        where: { departmentId: managerEmployee.departmentId },
        include,
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.employee.findMany({ include, orderBy: { createdAt: 'desc' } });
  },

  getById(id: string) {
    return prisma.employee.findUnique({ where: { id }, include });
  },

  getByUserId(userId: string) {
    return prisma.employee.findUnique({ where: { userId }, include });
  },

  async create(payload: EmployeeInput, actor?: Actor) {
    const existing = await prisma.employee.findUnique({ where: { email: payload.email } });

    if (existing) {
      throw new AppError('An employee with this email already exists', 409);
    }

    const organization = await prisma.organization.findFirst();

    const employee = await prisma.employee.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        organizationId: organization?.id,
        departmentId: payload.departmentId || undefined,
        jobTitle: payload.jobTitle,
        status: payload.status ?? 'ACTIVE',
        phone: payload.phone,
        gender: payload.gender,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
        joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : undefined,
      },
      include,
    });

    if (actor) {
      await auditService.record({
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        action: 'EMPLOYEE_CREATED',
        entityType: 'Employee',
        entityId: employee.id,
        metadata: { fullName: employee.fullName, email: employee.email },
      });
    }

    return employee;
  },

  async update(id: string, payload: Partial<EmployeeInput>, actor?: Actor) {
    const existing = await prisma.employee.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Employee not found', 404);
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(payload.fullName !== undefined && { fullName: payload.fullName }),
        ...(payload.email !== undefined && { email: payload.email }),
        ...(payload.departmentId !== undefined && { departmentId: payload.departmentId || null }),
        ...(payload.jobTitle !== undefined && { jobTitle: payload.jobTitle }),
        ...(payload.status !== undefined && { status: payload.status }),
        ...(payload.phone !== undefined && { phone: payload.phone }),
        ...(payload.gender !== undefined && { gender: payload.gender }),
        ...(payload.dateOfBirth !== undefined && { dateOfBirth: new Date(payload.dateOfBirth) }),
        ...(payload.joiningDate !== undefined && { joiningDate: new Date(payload.joiningDate) }),
      },
      include,
    });

    if (actor) {
      await auditService.record({
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        action: 'EMPLOYEE_UPDATED',
        entityType: 'Employee',
        entityId: updated.id,
        metadata: { changes: payload },
      });
    }

    return updated;
  },

  async remove(id: string, actor?: Actor) {
    const existing = await prisma.employee.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Employee not found', 404);
    }

    const removed = await prisma.employee.delete({ where: { id } });

    if (actor) {
      await auditService.record({
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        action: 'EMPLOYEE_DELETED',
        entityType: 'Employee',
        entityId: id,
        metadata: { fullName: existing.fullName, email: existing.email },
      });
    }

    return removed;
  },
};
