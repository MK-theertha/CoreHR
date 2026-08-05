import app from './app';
import env from './config/env';
import { prisma } from './config/prisma';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`CoreHR API listening on http://localhost:${env.PORT}`);
});

const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

const shutdown = (reason: string, exitCode: number) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info(`${reason} — shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(exitCode);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      logger.error('Error while closing HTTP server', err);
    }

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error('Error while disconnecting Prisma', disconnectError);
    }

    clearTimeout(forceExit);
    process.exit(exitCode);
  });

  // Idle keep-alive sockets won't send another request, so they'd otherwise
  // hold the server open until the client times out; close them immediately.
  server.closeIdleConnections();
};

process.on('SIGTERM', () => shutdown('SIGTERM received', 0));
process.on('SIGINT', () => shutdown('SIGINT received', 0));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
  shutdown('Unhandled promise rejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  shutdown('Uncaught exception', 1);
});
