import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import env from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import academicRoutes from './routes/academic.routes.js';
import peopleRoutes from './routes/people.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(compression());
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Throttle login attempts to slow credential stuffing.
app.use(
  '/api/auth/login',
  rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }),
);
app.use('/api', rateLimit({ windowMs: 60_000, max: 600, standardHeaders: true, legacyHeaders: false }));

app.get(['/', '/api'], (_req, res) =>
  res.json({
    success: true,
    message: 'SAMS API Backend is running',
    service: 'sams-api',
    version: '1.0.0',
    health: '/health',
    time: new Date().toISOString(),
  }),
);

app.get(['/health', '/api/health'], (_req, res) =>
  res.json({ success: true, data: { status: 'ok', service: 'sams-api', time: new Date().toISOString() } }),
);

app.use('/api/auth', authRoutes);
app.use('/api', academicRoutes);
app.use('/api', peopleRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', leaveRoutes);
app.use('/api', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
