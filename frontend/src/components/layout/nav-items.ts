import {
  BarChart3,
  Building2,
  CalendarDays,
  Bell,
  LayoutDashboard,
  Settings,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: string[];
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Employees', to: '/employees', icon: Users, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { label: 'Departments', to: '/departments', icon: Building2, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Leave', to: '/leave', icon: CalendarDays, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Notifications', to: '/notifications', icon: Bell, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN'] },
  { label: 'Settings', to: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Profile', to: '/profile', icon: UserCircle, roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
];
