import { prisma } from '../config/prisma';

export const reportsService = {
  async getSummary() {
    const [departments, employeesByStatus, leaveByStatus, usersByRole] = await Promise.all([
      prisma.department.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.employee.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.leaveRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);

    return {
      departmentBreakdown: departments.map((department) => ({
        name: department.name,
        employeeCount: department._count.employees,
      })),
      employeesByStatus: employeesByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      leaveRequestsByStatus: leaveByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      usersByRole: usersByRole.map((row) => ({ role: row.role, count: row._count._all })),
    };
  },
};
