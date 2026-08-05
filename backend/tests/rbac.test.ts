import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app';
import { authHeader } from './utils/token';

type Method = 'get' | 'post' | 'patch' | 'delete';

const send = (method: Method, path: string) => (request(app) as unknown as Record<Method, (path: string) => request.Test>)[method](path);

const ALL_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'];

// Every route below only requires *some* authenticated user — no role restriction.
// These assertions exist to catch someone accidentally removing `router.use(protect)`.
const protectOnlyRoutes: Array<[Method, string]> = [
  ['get', '/api/v1/auth/me'],
  ['get', '/api/v1/dashboard/summary'],
  ['get', '/api/v1/departments'],
  ['get', '/api/v1/departments/test-id'],
  ['get', '/api/v1/employees/me'],
  ['patch', '/api/v1/employees/me'],
  ['get', '/api/v1/leave'],
  ['post', '/api/v1/leave'],
  ['patch', '/api/v1/leave/test-id/cancel'],
  ['get', '/api/v1/notifications'],
  ['patch', '/api/v1/notifications/read-all'],
  ['patch', '/api/v1/notifications/test-id/read'],
];

// One entry per authorize(...)-guarded route across all 9 route groups (see docs/ARCHITECTURE.md §6).
const roleRestrictedRoutes: Array<[Method, string, string[]]> = [
  ['get', '/api/v1/dashboard/trends', ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']],
  ['get', '/api/v1/dashboard/activity', ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']],
  ['post', '/api/v1/departments', ['SUPER_ADMIN', 'HR_ADMIN']],
  ['patch', '/api/v1/departments/test-id', ['SUPER_ADMIN', 'HR_ADMIN']],
  ['delete', '/api/v1/departments/test-id', ['SUPER_ADMIN']],
  ['get', '/api/v1/employees', ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']],
  ['get', '/api/v1/employees/test-id', ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']],
  ['post', '/api/v1/employees', ['SUPER_ADMIN', 'HR_ADMIN']],
  ['patch', '/api/v1/employees/test-id', ['SUPER_ADMIN', 'HR_ADMIN']],
  ['delete', '/api/v1/employees/test-id', ['SUPER_ADMIN', 'HR_ADMIN']],
  ['patch', '/api/v1/leave/test-id/approve', ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']],
  ['patch', '/api/v1/leave/test-id/reject', ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']],
  ['get', '/api/v1/organization', ['SUPER_ADMIN']],
  ['patch', '/api/v1/organization', ['SUPER_ADMIN']],
  ['get', '/api/v1/reports/summary', ['SUPER_ADMIN']],
  ['get', '/api/v1/users/roles', ['SUPER_ADMIN']],
  ['patch', '/api/v1/users/test-id/role', ['SUPER_ADMIN']],
];

describe('RBAC — protect-only routes reject unauthenticated requests', () => {
  it.each(protectOnlyRoutes)('%s %s → 401 with no token', async (method, path) => {
    const res = await send(method, path);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('RBAC — role-restricted routes', () => {
  it.each(roleRestrictedRoutes)('%s %s → 401 with no token', async (method, path) => {
    const res = await send(method, path);
    expect(res.status).toBe(401);
  });

  for (const [method, path, allowedRoles] of roleRestrictedRoutes) {
    const disallowedRoles = ALL_ROLES.filter((role) => !allowedRoles.includes(role));

    it.each(disallowedRoles)(`${method.toUpperCase()} ${path} → 403 for disallowed role %s`, async (role) => {
      const res = await send(method, path).set('Authorization', authHeader(role));
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ success: false, message: 'Forbidden: insufficient permissions' });
    });
  }
});

describe('RBAC — public routes never require auth', () => {
  it('GET /health does not require a token', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/auth/logout does not require a token', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
  });
});
