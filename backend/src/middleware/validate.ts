import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return _res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: parsed.error.issues,
      });
    }

    req.body = parsed.data;
    next();
  };
