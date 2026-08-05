import dotenv from 'dotenv';

dotenv.config();

const clientUrls = (process.env.CLIENT_URL ?? 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const NODE_ENV = process.env.NODE_ENV ?? 'development';

if (NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) in production: ${missing.join(', ')}`
    );
  }
}

const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/corehr',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'corehr-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'corehr-refresh-secret-change-me',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '7d',
  CLIENT_URL: clientUrls.length === 1 ? clientUrls[0] : clientUrls,
};

export default env;
