import { Router } from 'express';
import { z } from 'zod';

import { employeeController } from '../controllers/employee.controller';
import { protect } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const employeeSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.email(),
  departmentId: z.string().optional().nullable(),
  jobTitle: z.string().max(80).optional(),
  status: z.enum(['ACTIVE', 'PROBATION', 'INACTIVE', 'TERMINATED']).default('ACTIVE'),
  phone: z.string().max(30).optional(),
  gender: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
  joiningDate: z.string().optional(),
});

const selfUpdateSchema = z.object({
  phone: z.string().max(30).optional(),
  gender: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
});

router.use(protect);

router.get('/me', employeeController.getMe);
router.patch('/me', validate(selfUpdateSchema), employeeController.updateMe);

router.get('/', authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), employeeController.list);
router.get('/:id', authorize('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'), employeeController.getById);
router.post('/', authorize('SUPER_ADMIN', 'HR_ADMIN'), validate(employeeSchema), employeeController.create);
router.patch('/:id', authorize('SUPER_ADMIN', 'HR_ADMIN'), validate(employeeSchema.partial()), employeeController.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'HR_ADMIN'), employeeController.remove);

export default router;
