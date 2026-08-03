import { Request, Response } from 'express';

import { employeeService } from '../services/employee.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

export const employeeController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const employees = await employeeService.list();

    res.json({ success: true, data: employees });
  }),

  getMe: asyncHandler(async (req: Request, res: Response) => {
    const employee = await employeeService.getByUserId(req.user!.id);

    if (!employee) {
      throw new AppError('No employee profile linked to this account', 404);
    }

    res.json({ success: true, data: employee });
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const employee = await employeeService.getByUserId(req.user!.id);

    if (!employee) {
      throw new AppError('No employee profile linked to this account', 404);
    }

    const updated = await employeeService.update(employee.id, req.body);

    res.json({ success: true, data: updated });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employee = await employeeService.getById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const employee = await employeeService.create(req.body);

    res.status(201).json({ success: true, data: employee });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employee = await employeeService.update(id, req.body);

    res.json({ success: true, data: employee });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employee = await employeeService.remove(id);

    res.json({ success: true, data: employee });
  }),
};
