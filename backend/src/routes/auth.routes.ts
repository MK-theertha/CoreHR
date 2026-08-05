import { Router } from 'express';
import { z } from 'zod';

import { authController } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a user
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.get('/me', protect, authController.me);

export default router;
