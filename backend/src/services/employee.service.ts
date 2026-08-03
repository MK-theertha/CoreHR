import { prisma } from '../config/prisma';
import { AppError } from '../utils/appError';

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

  async create(payload: EmployeeInput) {
    const existing = await prisma.employee.findUnique({ where: { email: payload.email } });

    if (existing) {
      throw new AppError('An employee with this email already exists', 409);
    }

    const organization = await prisma.organization.findFirst();

    return prisma.employee.create({
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
  },

  async update(id: string, payload: Partial<EmployeeInput>) {
    const existing = await prisma.employee.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Employee not found', 404);
    }

    return prisma.employee.update({
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
  },

  async remove(id: string) {
    const existing = await prisma.employee.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError('Employee not found', 404);
    }

    return prisma.employee.delete({ where: { id } });
  },
};
