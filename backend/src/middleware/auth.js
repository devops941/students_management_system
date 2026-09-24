import { asyncHandler, ApiError } from '../utils/helpers.js';
import { prisma } from '../config/prisma.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * JWT guard. Verifies the bearer token and loads the requester once so both
 * `authorize` and controllers can rely on `req.user`.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) throw new ApiError(401, 'Account is inactive');

  req.user = user;
  req.token = token;
  next();
});

/** Role gate: authorize('ADMIN') or authorize('ADMIN', 'FACULTY'). */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission for this action'),
      );
    }
    next();
  };
