import { Request, Response } from 'express';

import { departmentService } from '../services/department.service';
import { asyncHandler } from '../utils/asyncHandler';

export const departmentController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const departments = await departmentService.list();

    res.json({ success: true, data: departments });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const department = await departmentService.create(req.body);

    res.status(201).json({ success: true, data: department });
  }),
};
