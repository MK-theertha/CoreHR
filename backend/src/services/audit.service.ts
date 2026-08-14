import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';

export type AuditEntry = {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export type AuditFilter = {
  entityType?: string;
  entityId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
};

export const auditService = {
  record(entry: AuditEntry) {
    return prisma.auditLog.create({
      data: {
        userId: entry.userId ?? undefined,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ipAddress: entry.ipAddress ?? undefined,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  },

  async list(filter: AuditFilter) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 && filter.pageSize <= 100 ? filter.pageSize : 25;

    const where: Prisma.AuditLogWhereInput = {
      ...(filter.entityType && { entityType: filter.entityType }),
      ...(filter.entityId && { entityId: filter.entityId }),
      ...(filter.userId && { userId: filter.userId }),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { entries, total, page, pageSize };
  },
};
