import { Request, Response } from 'express';

import { leaveService } from '../services/leave.service';
import { asyncHandler } from '../utils/asyncHandler';

export const leaveController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const rawEmployeeId = Array.isArray(req.query.employeeId) ? req.query.employeeId[0] : req.query.employeeId;
    const employeeId = typeof rawEmployeeId === 'string' ? rawEmployeeId : undefined;
    const leaveRequests = await leaveService.listForUser(req.user!, employeeId);

    res.json({ success: true, data: leaveRequests });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const leaveRequest = await leaveService.create(req.user!.id, req.body, { userId: req.user!.id, ipAddress: req.ip });

    res.status(201).json({ success: true, data: leaveRequest });
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const leaveRequest = await leaveService.decide(id, req.user!.id, 'APPROVED', req.body.comments, {
      userId: req.user!.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: leaveRequest });
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const leaveRequest = await leaveService.decide(id, req.user!.id, 'REJECTED', req.body.comments, {
      userId: req.user!.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: leaveRequest });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const leaveRequest = await leaveService.cancel(id, req.user!.id, { userId: req.user!.id, ipAddress: req.ip });

    res.json({ success: true, data: leaveRequest });
  }),
};
