import { Request, Response } from 'express';

import { auditService } from '../services/audit.service';
import { asyncHandler } from '../utils/asyncHandler';

const asString = (value: unknown) => (Array.isArray(value) ? value[0] : value);

export const auditController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const entityType = asString(req.query.entityType);
    const entityId = asString(req.query.entityId);
    const userId = asString(req.query.userId);
    const page = asString(req.query.page);
    const pageSize = asString(req.query.pageSize);

    const result = await auditService.list({
      entityType: typeof entityType === 'string' ? entityType : undefined,
      entityId: typeof entityId === 'string' ? entityId : undefined,
      userId: typeof userId === 'string' ? userId : undefined,
      page: typeof page === 'string' ? Number(page) : undefined,
      pageSize: typeof pageSize === 'string' ? Number(pageSize) : undefined,
    });

    res.json({ success: true, data: result.entries, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
  }),
};
