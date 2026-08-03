import { Router } from 'express';
import { z } from 'zod';

import { leaveController } from '../controllers/leave.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const createSchema = z.object({
  leaveType: z.string().min(2).max(80),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(2).max(500),
});

const decisionSchema = z.object({
  comments: z.string().max(500).optional(),
});

router.use(protect);

router.get('/', leaveController.list);
router.post('/', validate(createSchema), leaveController.create);
router.patch('/:id/approve', authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), validate(decisionSchema), leaveController.approve);
router.patch('/:id/reject', authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), validate(decisionSchema), leaveController.reject);
router.patch('/:id/cancel', leaveController.cancel);

export default router;
