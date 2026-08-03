import { Router } from 'express';

import { dashboardController } from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(protect);

router.get('/summary', dashboardController.summary);
router.get('/trends', authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), dashboardController.trends);
router.get('/activity', authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), dashboardController.activity);

export default router;
