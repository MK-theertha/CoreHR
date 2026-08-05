import jwt from 'jsonwebtoken';

import env from '../../src/config/env';

export type TestRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export function signAccessToken(overrides: {
  sub?: string;
  email?: string;
  role?: TestRole | string;
  organizationId?: string | null;
} = {}) {
  return jwt.sign(
    {
      sub: overrides.sub ?? 'user-1',
      email: overrides.email ?? 'user@corehr.dev',
      role: overrides.role ?? 'EMPLOYEE',
      organizationId: overrides.organizationId ?? 'org-1',
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

export function authHeader(role: TestRole | string, overrides: Parameters<typeof signAccessToken>[0] = {}) {
  return `Bearer ${signAccessToken({ ...overrides, role })}`;
}
