import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'sams-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES || 30),
  minAttendancePercent: Number(process.env.MIN_ATTENDANCE_PERCENT || 75),
  editWindowHours: Number(process.env.ATTENDANCE_EDIT_WINDOW_HOURS || 24),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.ALERT_FROM || 'no-reply@sams.local',
  },
};

export default env;
