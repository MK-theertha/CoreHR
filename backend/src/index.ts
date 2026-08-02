import app from './app';
import env from './config/env';
import { logger } from './utils/logger';

app.listen(env.PORT, () => {
  logger.info(`CoreHR API listening on http://localhost:${env.PORT}`);
});
