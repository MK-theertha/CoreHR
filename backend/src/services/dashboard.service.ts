import { prisma } from '../config/prisma';

const canViewOrgStats = (role: string) => ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(role);

export const dashboardService = {
  async getSummary(user: { id: string; role: string }) {
    if (canViewOrgStats(user.role)) {
      const [totalEmployees, activeEmployees, pendingLeaveRequests, departments] = await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: 'ACTIVE' } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        prisma.department.findMany({
          include: { _count: { select: { employees: true } } },
          orderBy: { name: 'asc' },
        }),
      ]);

      return {
        scope: 'ORGANIZATION' as const,
        totalEmployees,
        activeEmployees,
        pendingLeaveRequests,
        departmentBreakdown: departments.map((department) => ({
          name: department.name,
          employeeCount: department._count.employees,
        })),
      };
    }

    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });

    if (!employee) {
      return { scope: 'PERSONAL' as const, myPendingLeaveRequests: 0, myApprovedLeaveRequests: 0, unreadNotifications: 0 };
    }

    const [myPendingLeaveRequests, myApprovedLeaveRequests, unreadNotifications] = await Promise.all([
      prisma.leaveRequest.count({ where: { employeeId: employee.id, status: 'PENDING' } }),
      prisma.leaveRequest.count({ where: { employeeId: employee.id, status: 'APPROVED' } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return {
      scope: 'PERSONAL' as const,
      myPendingLeaveRequests,
      myApprovedLeaveRequests,
      unreadNotifications,
    };
  },
};
