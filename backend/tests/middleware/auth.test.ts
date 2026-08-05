import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import env from '../../src/config/env';
import { protect } from '../../src/middleware/auth';
import { AppError } from '../../src/utils/appError';
import { signAccessToken } from '../utils/token';

function mockReq(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

describe('protect middleware', () => {
  it('rejects with 401 when no Authorization header is present', () => {
    const next = vi.fn() as unknown as NextFunction;
    protect(mockReq(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('rejects with 401 when the header does not start with "Bearer "', () => {
    const next = vi.fn() as unknown as NextFunction;
    protect(mockReq('Basic abc123'), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('rejects with 401 when the token signature is invalid', () => {
    const bogusToken = jwt.sign({ sub: 'user-1', email: 'a@b.com', role: 'EMPLOYEE' }, 'wrong-secret');
    const next = vi.fn() as unknown as NextFunction;
    protect(mockReq(`Bearer ${bogusToken}`), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Invalid or expired token');
  });

  it('rejects with 401 when the token is expired', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-1', email: 'a@b.com', role: 'EMPLOYEE' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: -10 },
    );
    const next = vi.fn() as unknown as NextFunction;
    protect(mockReq(`Bearer ${expiredToken}`), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Invalid or expired token');
  });

  it('attaches req.user from a valid token payload and calls next() with no error', () => {
    const token = signAccessToken({ sub: 'user-42', email: 'admin@corehr.dev', role: 'SUPER_ADMIN', organizationId: 'org-9' });
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn() as unknown as NextFunction;

    protect(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: 'user-42',
      email: 'admin@corehr.dev',
      role: 'SUPER_ADMIN',
      organizationId: 'org-9',
    });
  });

  it('defaults organizationId to null when the token payload omits it', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'a@b.com', role: 'EMPLOYEE' }, env.JWT_ACCESS_SECRET);
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn() as unknown as NextFunction;

    protect(req, {} as Response, next);

    expect(req.user?.organizationId).toBeNull();
  });
});
