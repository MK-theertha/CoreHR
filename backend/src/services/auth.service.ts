import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../config/prisma';
import env from '../config/env';
import { AppError } from '../utils/appError';

export type AppRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

const signToken = (payload: Record<string, unknown>, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });

const toPublicUser = (user: { id: string; name: string; email: string; organizationId: string | null; role: AppRole }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId,
});

const issueTokens = (user: { id: string; email: string; organizationId: string | null; role: AppRole }) => ({
  accessToken: signToken(
    { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_TTL,
  ),
  refreshToken: signToken({ sub: user.id, type: 'refresh' }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_TTL),
});

export const authService = {
  async register(payload: { name: string; email: string; password: string }) {
    const email = payload.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new AppError('User already exists', 409);
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email,
        passwordHash,
        role: 'EMPLOYEE',
      },
    });

    const existingEmployee = await prisma.employee.findUnique({ where: { email } });

    if (existingEmployee) {
      if (!existingEmployee.userId) {
        await prisma.employee.update({ where: { id: existingEmployee.id }, data: { userId: user.id } });
      }
    } else {
      const organization = await prisma.organization.findFirst();

      await prisma.employee.create({
        data: {
          fullName: payload.name,
          email,
          organizationId: organization?.id,
          userId: user.id,
          status: 'ACTIVE',
        },
      });
    }

    return {
      user: toPublicUser(user),
      ...issueTokens(user),
    };
  },

  async login(payload: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    return {
      user: toPublicUser(user),
      ...issueTokens(user),
    };
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string; type?: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

      if (!user) {
        throw new AppError('User not found', 401);
      }

      return { accessToken: issueTokens(user).accessToken };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toPublicUser(user) : null;
  },
};
