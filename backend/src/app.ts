import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import env from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import departmentRoutes from './routes/department.routes';
import employeeRoutes from './routes/employee.routes';
import leaveRoutes from './routes/leave.routes';
import notificationRoutes from './routes/notification.routes';
import organizationRoutes from './routes/organization.routes';
import reportsRoutes from './routes/reports.routes';
import userRoutes from './routes/user.routes';

const app = express();

const isAllowedOrigin = (origin: string) => {
  const allowList = Array.isArray(env.CLIENT_URL) ? env.CLIENT_URL : [env.CLIENT_URL];

  if (allowList.includes(origin)) {
    return true;
  }

  return env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin);
};

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'CoreHR API', timestamp: new Date().toISOString() },
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/organization', organizationRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;
