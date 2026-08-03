import { Request, Response } from 'express';

import { reportsService } from '../services/reports.service';
import { asyncHandler } from '../utils/asyncHandler';

export const reportsController = {
  summary: asyncHandler(async (_req: Request, res: Response) => {
    const summary = await reportsService.getSummary();

    res.json({ success: true, data: summary });
  }),
};
