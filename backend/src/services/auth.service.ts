import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import env from '../config/env';
import { AppError } from '../utils/appError';

export type AppRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  organizationId: string;
};

const seededUsers: AuthUser[] = [
  {
    id: 'user-super-admin',
    name: 'System Administrator',
    email: 'admin@corehr.dev',
    role: 'SUPER_ADMIN',
    organizationId: 'org-corehr',
  },
];

const passwordStore: Record<string, string> = {
  'user-super-admin': '$2b$10$WbFVdaHw3kYiiiyNT8wtiuHHeJueHDkuM8xxrnMw1ZcBxCkydQ9ue',
};

const hash = async (plainText: string) => bcrypt.hash(plainText, 10);

const signToken = (payload: Record<string, unknown>, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });

export const authService = {
  async register(payload: { name: string; email: string; password: string; role?: AppRole }) {
    const existing = seededUsers.find((user) => user.email.toLowerCase() === payload.email.toLowerCase());

    if (existing) {
      throw new AppError('User already exists', 409);
    }

    const userId = `user-${Date.now()}`;
    const user: AuthUser = {
      id: userId,
      name: payload.name,
      email: payload.email,
      role: payload.role ?? 'EMPLOYEE',
      organizationId: 'org-corehr',
    };

    seededUsers.push(user);
    passwordStore[userId] = await hash(payload.password);

    return {
      user: { ...user },
      accessToken: signToken(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        env.JWT_ACCESS_SECRET,
        env.JWT_ACCESS_TTL,
      ),
      refreshToken: signToken(
        { sub: user.id, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        env.JWT_REFRESH_TTL,
      ),
    };
  },

  async login(payload: { email: string; password: string }) {
    const user = seededUsers.find((entry) => entry.email.toLowerCase() === payload.email.toLowerCase());

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const storedHash = passwordStore[user.id];
    const isValid = !!storedHash && (await bcrypt.compare(payload.password, storedHash));

    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    return {
      user: { ...user },
      accessToken: signToken(
        { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        env.JWT_ACCESS_SECRET,
        env.JWT_ACCESS_TTL,
      ),
      refreshToken: signToken(
        { sub: user.id, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        env.JWT_REFRESH_TTL,
      ),
    };
  },

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        sub: string;
        type?: string;
      };

      const user = seededUsers.find((entry) => entry.id === payload.sub);

      if (!user) {
        throw new AppError('User not found', 401);
      }

      return {
        accessToken: signToken(
          { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
          env.JWT_ACCESS_SECRET,
          env.JWT_ACCESS_TTL,
        ),
      };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  },

  getUserById(id: string) {
    return seededUsers.find((user) => user.id === id) ?? null;
  },
};
