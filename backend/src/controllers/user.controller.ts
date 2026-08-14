import { Request, Response } from 'express';

import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';

export const userController = {
  listRoles: (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
    });
  },

  updateRole: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await userService.updateRole(id, req.body.role, { userId: req.user!.id, ipAddress: req.ip });

    res.json({ success: true, data: user });
  }),
};
