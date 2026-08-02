import { Router } from 'express';
import { z } from 'zod';

import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const roleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']),
});

router.use(protect);

router.get('/roles', authorize('SUPER_ADMIN'), (_req, res) => {
  res.json({
    success: true,
    data: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
  });
});

router.patch('/role', authorize('SUPER_ADMIN'), validate(roleSchema), (req, res) => {
  res.json({
    success: true,
    data: { message: 'Role update requested', role: req.body.role },
  });
});

export default router;
