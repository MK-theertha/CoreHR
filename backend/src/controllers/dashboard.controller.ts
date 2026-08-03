import { Request, Response } from 'express';

import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await dashboardService.getSummary(req.user!);

    res.json({ success: true, data: summary });
  }),

  trends: asyncHandler(async (_req: Request, res: Response) => {
    const trends = await dashboardService.getTrends();

    res.json({ success: true, data: trends });
  }),

  activity: asyncHandler(async (_req: Request, res: Response) => {
    const activity = await dashboardService.getActivity();

    res.json({ success: true, data: activity });
  }),
};
