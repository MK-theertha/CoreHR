import { Request, Response } from 'express';

import { employeeService } from '../services/employee.service';
import { asyncHandler } from '../utils/asyncHandler';

export const employeeController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const employees = employeeService.list();

    res.json({ success: true, data: employees });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employee = employeeService.getById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const employee = employeeService.create(req.body);

    res.status(201).json({ success: true, data: employee });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employee = employeeService.update(id, req.body);

    res.json({ success: true, data: employee });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employee = employeeService.remove(id);

    res.json({ success: true, data: employee });
  }),
};
