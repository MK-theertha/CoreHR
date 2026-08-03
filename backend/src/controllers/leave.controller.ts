import { Request, Response } from 'express';

import { leaveService } from '../services/leave.service';
import { asyncHandler } from '../utils/asyncHandler';

export const leaveController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const leaveRequests = await leaveService.listForUser(req.user!);

    res.json({ success: true, data: leaveRequests });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const leaveRequest = await leaveService.create(req.user!.id, req.body);

    res.status(201).json({ success: true, data: leaveRequest });
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const leaveRequest = await leaveService.decide(id, req.user!.id, 'APPROVED', req.body.comments);

    res.json({ success: true, data: leaveRequest });
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const leaveRequest = await leaveService.decide(id, req.user!.id, 'REJECTED', req.body.comments);

    res.json({ success: true, data: leaveRequest });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const leaveRequest = await leaveService.cancel(id, req.user!.id);

    res.json({ success: true, data: leaveRequest });
  }),
};
