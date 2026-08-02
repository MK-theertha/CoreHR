export const logger = {
  info: (...args: unknown[]) => console.info('[CoreHR]', ...args),
  warn: (...args: unknown[]) => console.warn('[CoreHR]', ...args),
  error: (...args: unknown[]) => console.error('[CoreHR]', ...args),
};
