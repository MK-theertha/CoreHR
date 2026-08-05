import { CookieOptions, Request, Response } from 'express';

import env from '../config/env';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parseDurationMs } from '../utils/parseDuration';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

const refreshCookieOptions = (remember: boolean): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
  ...(remember ? { maxAge: parseDurationMs(env.JWT_REFRESH_TTL) } : {}),
});

const setRefreshCookie = (res: Response, refreshToken: string, remember: boolean) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(remember));
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, ...result } = await authService.register(req.body);
    setRefreshCookie(res, refreshToken, true);

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { remember = true, ...credentials } = req.body;
    const { refreshToken, ...result } = await authService.login(credentials);
    setRefreshCookie(res, refreshToken, remember);

    res.json({
      success: true,
      data: result,
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });

    res.json({
      success: true,
      data: null,
    });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRecord = await authService.getUserById(user.id);

    res.json({
      success: true,
      data: userRecord,
    });
  }),
};
