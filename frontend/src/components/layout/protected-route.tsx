import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../../hooks/useAuth';

type ProtectedRouteProps = {
  roles: string[];
  children: ReactNode;
};

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!roles.includes(user.role)) {
    toast.error("You don't have permission to view that page");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
