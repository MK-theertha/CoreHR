export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type EmploymentStatus = 'ACTIVE' | 'PROBATION' | 'INACTIVE' | 'TERMINATED';

export type Department = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
};

export type Employee = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  jobTitle: string | null;
  departmentId: string | null;
  department: Department | null;
  joiningDate: string | null;
  status: EmploymentStatus;
  profileImage: string | null;
  organizationId: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    email: string;
    departmentId: string | null;
    userId: string | null;
  };
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  userId: string | null;
  createdAt: string;
};

export type DashboardSummary =
  | {
      scope: 'ORGANIZATION';
      totalEmployees: number;
      activeEmployees: number;
      pendingLeaveRequests: number;
      departmentBreakdown: { name: string; employeeCount: number }[];
    }
  | {
      scope: 'PERSONAL';
      myPendingLeaveRequests: number;
      myApprovedLeaveRequests: number;
      unreadNotifications: number;
    };

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};
