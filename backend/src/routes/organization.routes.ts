import { Router } from 'express';
import { z } from 'zod';

import { organizationController } from '../controllers/organization.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const updateSchema = z.object({
  name: z.string().min(2).max(120),
});

router.use(protect, authorize('SUPER_ADMIN'));

router.get('/', organizationController.get);
router.patch('/', validate(updateSchema), organizationController.update);

export default router;
