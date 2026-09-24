import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler, ok } from '../utils/helpers.js';
import { signToken } from '../utils/jwt.js';
import { sendMail } from '../services/mailer.service.js';
import { recordAudit } from '../services/audit.service.js';
import env from '../config/env.js';

const profileInclude = {
  student: { include: { class: true, department: true } },
  faculty: { include: { department: true } },
  parent: { include: { students: { include: { user: { select: { name: true } } } } } },
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
    include: profileInclude,
  });
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError(401, 'Invalid email or password');
  if (!user.active) throw new ApiError(403, 'Account is disabled. Contact admin.');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await recordAudit({
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ip: req.ip,
    userId: user.id,
  });

  const token = signToken(user);
  const { password: _pw, ...safe } = user;
  return ok(res, { token, user: safe, expiresIn: env.jwtExpiresIn });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: profileInclude,
  });
  const { password: _pw, ...safe } = user;
  return ok(res, safe);
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'STUDENT', phone } = req.body || {};
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }
  const exists = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (exists) throw new ApiError(409, 'Email is already registered');

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password, 10),
      role,
      phone: phone || null,
    },
  });
  await recordAudit({ action: 'REGISTER', entity: 'User', entityId: user.id, userId: user.id });
  return ok(res, { id: user.id, email: user.email, role: user.role }, 201);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }
  if (String(newPassword).length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new ApiError(400, 'Current password is incorrect');

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
  await recordAudit({ action: 'CHANGE_PASSWORD', entity: 'User', entityId: user.id, userId: user.id });
  return ok(res, { message: 'Password updated successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const user = await prisma.user.findUnique({
    where: { email: String(email || '').toLowerCase().trim() },
  });
  // Always answer the same way so the endpoint cannot enumerate accounts.
  if (!user) return ok(res, { message: 'If the email exists, a reset link was sent.' });

  const token = crypto.randomBytes(24).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  await sendMail({
    to: user.email,
    subject: 'SAMS password reset',
    text: `Use this token to reset your password (valid 30 minutes): ${token}`,
  });
  return ok(res, {
    message: 'If the email exists, a reset link was sent.',
    // Exposed only outside production to make the demo flow testable.
    ...(env.nodeEnv !== 'production' ? { devToken: token } : {}),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) throw new ApiError(400, 'Token and new password are required');

  const user = await prisma.user.findFirst({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new ApiError(400, 'Reset token is invalid or expired');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 10),
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
  return ok(res, { message: 'Password reset successfully' });
});
