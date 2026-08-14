import { lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { AppShell } from './components/layout/app-shell';
import { AuthContext } from './hooks/useAuth';
import { apiFetch, authFetch, clearTokens, getAccessToken, logoutRequest, setTokens, UNAUTHORIZED_EVENT } from './lib/api';
import type { AppUser } from './types';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const EmployeeDetailPage = lazy(() => import('./pages/EmployeeDetailPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const DepartmentDetailPage = lazy(() => import('./pages/DepartmentDetailPage'));
const LeavePage = lazy(() => import('./pages/LeavePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await logoutRequest();
    clearTokens();
    setUser(null);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      navigate('/login', { replace: true });
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsAuthReady(true);
      return;
    }

    authFetch<{ success: boolean; data: { id: string; name: string; email: string; role: string } | null }>('/auth/me')
      .then((response) => {
        const currentUser = response.data;

        if (currentUser) {
          setUser({
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role as AppUser['role'],
          });
        } else {
          clearTokens();
        }
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsAuthReady(true));
  }, []);

  const handleLogin = async (email: string, password: string, remember = true) => {
    const response = await apiFetch<{
      success: boolean;
      data: {
        user: { id: string; name: string; email: string; role: AppUser['role'] };
        accessToken: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember }),
    });

    const { user: loggedInUser, accessToken } = response.data;

    setTokens(accessToken, remember);
    setUser({
      id: loggedInUser.id,
      name: loggedInUser.name,
      email: loggedInUser.email,
      role: loggedInUser.role,
    });
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    const response = await apiFetch<{
      success: boolean;
      data: {
        user: { id: string; name: string; email: string; role: AppUser['role'] };
        accessToken: string;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    const { user: registeredUser, accessToken } = response.data;

    setTokens(accessToken);
    setUser({
      id: registeredUser.id,
      name: registeredUser.name,
      email: registeredUser.email,
      role: registeredUser.role,
    });
  };

  if (!isAuthReady) {
    return null;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignupPage onSignup={handleSignup} />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} />
      </Routes>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:id" element={<DepartmentDetailPage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
