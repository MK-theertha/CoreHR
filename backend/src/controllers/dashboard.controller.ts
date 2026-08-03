import { Request, Response } from 'express';

import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await dashboardService.getSummary(req.user!);

    res.json({ success: true, data: summary });
  }),
};
