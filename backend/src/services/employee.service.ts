import { AppError } from '../utils/appError';

export type EmployeeStatus = 'ACTIVE' | 'PROBATION' | 'INACTIVE' | 'TERMINATED';

export type EmployeeRecord = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  status: EmployeeStatus;
  managerId?: string;
  organizationId: string;
};

const employees: EmployeeRecord[] = [
  {
    id: 'emp-1001',
    fullName: 'Alicia Morgan',
    email: 'alicia.morgan@corehr.dev',
    department: 'Engineering',
    jobTitle: 'Senior Frontend Engineer',
    status: 'ACTIVE',
    organizationId: 'org-corehr',
  },
  {
    id: 'emp-1002',
    fullName: 'Daniel Ross',
    email: 'daniel.ross@corehr.dev',
    department: 'People Ops',
    jobTitle: 'HR Manager',
    status: 'ACTIVE',
    organizationId: 'org-corehr',
  },
];

export const employeeService = {
  list() {
    return employees;
  },

  getById(id: string) {
    return employees.find((employee) => employee.id === id) ?? null;
  },

  create(payload: Omit<EmployeeRecord, 'id' | 'organizationId'>) {
    const nextEmployee: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      organizationId: 'org-corehr',
      ...payload,
    };

    employees.push(nextEmployee);
    return nextEmployee;
  },

  update(id: string, payload: Partial<EmployeeRecord>) {
    const employeeIndex = employees.findIndex((employee) => employee.id === id);

    if (employeeIndex === -1) {
      throw new AppError('Employee not found', 404);
    }

    employees[employeeIndex] = {
      ...employees[employeeIndex],
      ...payload,
    };

    return employees[employeeIndex];
  },

  remove(id: string) {
    const index = employees.findIndex((employee) => employee.id === id);

    if (index === -1) {
      throw new AppError('Employee not found', 404);
    }

    const [removed] = employees.splice(index, 1);
    return removed;
  },
};
