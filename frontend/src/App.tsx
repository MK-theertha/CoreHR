import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { AuthContext } from './hooks/useAuth';
import { apiFetch, authFetch, clearTokens, getAccessToken, setTokens, UNAUTHORIZED_EVENT } from './lib/api';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import LeavePage from './pages/LeavePage';
import LoginPage from './pages/LoginPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';
import type { AppUser } from './types';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Employees', to: '/employees', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { label: 'Leave', to: '/leave', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Notifications', to: '/notifications', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { label: 'Profile', to: '/profile', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
];

function AppShell({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const location = useLocation();
  const visibleNav = useMemo(() => navItems.filter((item) => item.roles.includes(user.role)), [user]);
  const activeLabel = visibleNav.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Dashboard';

  return (
    <AuthContext.Provider value={{ user, logout: onLogout }}>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-slate-900 text-slate-100">
          <div className="flex items-center gap-3 border-b border-slate-700 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-corehr-500 font-bold text-white">CH</div>
            <div>
              <p className="text-lg font-semibold">CoreHR</p>
              <p className="text-xs text-slate-400">Workforce suite</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2 px-4">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-4">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
        </aside>

        <main className="ml-64 p-8">
          <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-corehr-600">Operations</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{activeLabel}</h1>
            </div>
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </header>

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
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

  const handleLogin = async (email: string, password: string) => {
    const response = await apiFetch<{
      success: boolean;
      data: {
        user: { id: string; name: string; email: string; role: AppUser['role'] };
        accessToken: string;
        refreshToken: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const { user: loggedInUser, accessToken, refreshToken } = response.data;

    setTokens(accessToken, refreshToken);
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
        refreshToken: string;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    const { user: registeredUser, accessToken, refreshToken } = response.data;

    setTokens(accessToken, refreshToken);
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
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<AppShell user={user} onLogout={logout} />} />
    </Routes>
  );
}

export default App;
