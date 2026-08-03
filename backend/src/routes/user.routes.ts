import { Router } from 'express';
import { z } from 'zod';

import { userController } from '../controllers/user.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const roleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']),
});

router.use(protect);

router.get('/roles', authorize('SUPER_ADMIN'), userController.listRoles);
router.patch('/:id/role', authorize('SUPER_ADMIN'), validate(roleSchema), userController.updateRole);

export default router;
