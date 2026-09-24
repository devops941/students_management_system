import env from '../config/env.js';
import { ApiError } from '../utils/helpers.js';

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Route not found'));
}

export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Translate known Prisma errors into clean API responses.
  if (err.code === 'P2002') {
    status = 409;
    const target = err.meta?.target;
    message = `Duplicate value${target ? `: ${Array.isArray(target) ? target.join(', ') : target}` : ''}`;
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'Requested record was not found';
  } else if (err.name === 'ValidationError') {
    status = 400;
  }

  if (status >= 500 && env.nodeEnv === 'production') {
    message = 'Internal server error';
  }
  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
    ...(env.nodeEnv !== 'production' ? { stack: err.stack } : {}),
  });
}
