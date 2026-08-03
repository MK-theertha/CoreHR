import { Request, Response } from 'express';

import { organizationService } from '../services/organization.service';
import { asyncHandler } from '../utils/asyncHandler';

export const organizationController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const organization = await organizationService.get();

    res.json({ success: true, data: organization });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const organization = await organizationService.update(req.body);

    res.json({ success: true, data: organization });
  }),
};
