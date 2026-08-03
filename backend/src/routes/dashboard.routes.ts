import { Router } from 'express';

import { dashboardController } from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/summary', dashboardController.summary);

export default router;
