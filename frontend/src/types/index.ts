export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type AppUser = {
  name: string;
  email: string;
  role: UserRole;
};

export type Employee = {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  status: 'ACTIVE' | 'PROBATION' | 'INACTIVE';
};
