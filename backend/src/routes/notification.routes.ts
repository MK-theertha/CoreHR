import { Router } from 'express';

import { notificationController } from '../controllers/notification.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;
