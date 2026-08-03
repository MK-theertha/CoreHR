import { Router } from 'express';

import { reportsController } from '../controllers/reports.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(protect, authorize('SUPER_ADMIN'));

router.get('/summary', reportsController.summary);

export default router;
