import { Router } from 'express';

import { auditController } from '../controllers/audit.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(protect);

router.get('/', authorize('SUPER_ADMIN', 'HR_ADMIN'), auditController.list);

export default router;
