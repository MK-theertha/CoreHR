import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/appError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  const payload = {
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (isOperational) {
    return res.status(statusCode).json(payload);
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
