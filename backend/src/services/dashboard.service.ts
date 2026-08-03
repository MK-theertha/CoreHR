import { prisma } from '../config/prisma';

const canViewOrgStats = (role: string) => ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(role);

type MonthCount = { month: Date; count: bigint };
type MonthStatusCount = { month: Date; status: string; count: bigint };

const MONTHS_BACK = 11;

function lastNMonthKeys(count: number) {
  const keys: string[] = [];
  const now = new Date();

  for (let i = count; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(date.toISOString().slice(0, 7));
  }

  return keys;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function sinceDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_BACK, 1));
}

export const dashboardService = {
  async getSummary(user: { id: string; role: string }) {
    if (canViewOrgStats(user.role)) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalEmployees,
        activeEmployees,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
        newEmployees,
        departments,
      ] = await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: 'ACTIVE' } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        prisma.leaveRequest.count({ where: { status: 'APPROVED' } }),
        prisma.leaveRequest.count({ where: { status: 'REJECTED' } }),
        prisma.employee.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.department.findMany({
          include: { _count: { select: { employees: true } } },
          orderBy: { name: 'asc' },
        }),
      ]);

      return {
        scope: 'ORGANIZATION' as const,
        totalEmployees,
        activeEmployees,
        departmentsCount: departments.length,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
        newEmployees,
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

  async getTrends() {
    const since = sinceDate();
    const months = lastNMonthKeys(MONTHS_BACK);

    const [employeeGrowthRows, leaveTrendRows, monthlyHiringRows] = await Promise.all([
      prisma.$queryRaw<MonthCount[]>`
        SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
        FROM "Employee" WHERE "createdAt" >= ${since}
        GROUP BY month ORDER BY month ASC`,
      prisma.$queryRaw<MonthStatusCount[]>`
        SELECT date_trunc('month', "createdAt") AS month, status::text AS status, COUNT(*)::bigint AS count
        FROM "LeaveRequest" WHERE "createdAt" >= ${since}
        GROUP BY month, status ORDER BY month ASC`,
      prisma.$queryRaw<MonthCount[]>`
        SELECT date_trunc('month', "joiningDate") AS month, COUNT(*)::bigint AS count
        FROM "Employee" WHERE "joiningDate" IS NOT NULL AND "joiningDate" >= ${since}
        GROUP BY month ORDER BY month ASC`,
    ]);

    const employeeGrowthMap = new Map(employeeGrowthRows.map((row) => [row.month.toISOString().slice(0, 7), Number(row.count)]));
    const monthlyHiringMap = new Map(monthlyHiringRows.map((row) => [row.month.toISOString().slice(0, 7), Number(row.count)]));

    const leaveTrendMap = new Map<string, Record<string, number>>();
    for (const row of leaveTrendRows) {
      const key = row.month.toISOString().slice(0, 7);
      const existing = leaveTrendMap.get(key) ?? { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
      existing[row.status] = Number(row.count);
      leaveTrendMap.set(key, existing);
    }

    return {
      employeeGrowth: months.map((key) => ({ month: monthLabel(key), count: employeeGrowthMap.get(key) ?? 0 })),
      monthlyHiring: months.map((key) => ({ month: monthLabel(key), count: monthlyHiringMap.get(key) ?? 0 })),
      leaveTrends: months.map((key) => {
        const counts = leaveTrendMap.get(key) ?? { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
        return { month: monthLabel(key), PENDING: counts.PENDING ?? 0, APPROVED: counts.APPROVED ?? 0, REJECTED: counts.REJECTED ?? 0, CANCELLED: counts.CANCELLED ?? 0 };
      }),
    };
  },

  async getActivity() {
    const [recentDecisions, recentHires] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { status: { in: ['APPROVED', 'REJECTED'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { employee: { select: { fullName: true } } },
      }),
      prisma.employee.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, fullName: true, createdAt: true },
      }),
    ]);

    const decisionItems = recentDecisions.map((request) => ({
      id: `leave-${request.id}`,
      type: 'LEAVE_DECISION' as const,
      message: `${request.employee.fullName}'s ${request.leaveType.toLowerCase()} request was ${request.status.toLowerCase()}`,
      timestamp: request.updatedAt,
    }));

    const hireItems = recentHires.map((employee) => ({
      id: `employee-${employee.id}`,
      type: 'EMPLOYEE_CREATED' as const,
      message: `${employee.fullName} joined the organization`,
      timestamp: employee.createdAt,
    }));

    return [...decisionItems, ...hireItems].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
  },
};
