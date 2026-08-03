import { Router } from 'express';
import { z } from 'zod';

import { departmentController } from '../controllers/department.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const departmentSchema = z.object({
  name: z.string().min(2).max(80),
});

router.use(protect);

router.get('/', departmentController.list);
router.post('/', authorize('SUPER_ADMIN', 'HR_ADMIN'), validate(departmentSchema), departmentController.create);

export default router;
