import { Request, Response } from 'express';

import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const notifications = await notificationService.listForUser(req.user!.id);

    res.json({ success: true, data: notifications });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await notificationService.markRead(id, req.user!.id);

    res.json({ success: true, data: notification });
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllRead(req.user!.id);

    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  }),
};
