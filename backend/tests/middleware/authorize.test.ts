import { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { authorize } from '../../src/middleware/authorize';
import { AppError } from '../../src/utils/appError';

function mockReq(role?: string): Request {
  return { user: role ? { id: 'u1', email: 'u1@corehr.dev', role, organizationId: null } : undefined } as unknown as Request;
}

describe('authorize middleware', () => {
  it('rejects with 401 when req.user is missing (protect did not run)', () => {
    const next = vi.fn() as unknown as NextFunction;
    authorize('SUPER_ADMIN')(mockReq(undefined), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  it('rejects with 403 when the user role is not in the allowed list', () => {
    const next = vi.fn() as unknown as NextFunction;
    authorize('SUPER_ADMIN', 'HR_ADMIN')(mockReq('EMPLOYEE'), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden: insufficient permissions');
  });

  it('calls next() with no error when the user role is in the allowed list', () => {
    const next = vi.fn() as unknown as NextFunction;
    authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER')(mockReq('MANAGER'), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('is an exact role match, not a substring or case-insensitive match', () => {
    const next = vi.fn() as unknown as NextFunction;
    authorize('ADMIN')(mockReq('SUPER_ADMIN'), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });
});
