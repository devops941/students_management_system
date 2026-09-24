import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler, ok, paginate } from '../utils/helpers.js';
import { recordAudit } from '../services/audit.service.js';

const userInclude = {
  student: { include: { class: true, department: true } },
  faculty: { include: { department: true } },
  parent: { include: { students: { include: { user: { select: { name: true } } } } } },
};

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.q) {
    where.OR = [
      { name: { contains: req.query.q, mode: 'insensitive' } },
      { email: { contains: req.query.q, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        active: true, lastLoginAt: true, createdAt: true,
        student: { select: { rollNumber: true, class: { select: { name: true, section: true } } } },
        faculty: { select: { employeeCode: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: userInclude,
  });
  if (!user) throw new ApiError(404, 'User not found');
  const { password: _pw, ...safe } = user;
  return ok(res, safe);
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, active } = req.body;
  const exists = await prisma.user.findUnique({ where: { email: email?.toLowerCase() } });
  if (exists) throw new ApiError(409, 'Email is already registered');
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password || 'Welcome@123', 10),
      role,
      phone: phone || null,
      active: active ?? true,
    },
    include: userInclude,
  });
  await recordAudit({ action: 'CREATE', entity: 'User', entityId: user.id, userId: req.user.id, ip: req.ip });
  const { password: _pw, ...safe } = user;
  return ok(res, safe, 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...rest } = req.body;
  const data = { ...rest };
  if (password) data.password = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: userInclude,
  });
  await recordAudit({ action: 'UPDATE', entity: 'User', entityId: user.id, userId: req.user.id, ip: req.ip });
  const { password: _pw, ...safe } = user;
  return ok(res, safe);
});

export const toggleUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.id === req.user.id) throw new ApiError(400, 'You cannot disable your own account');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { active: !user.active },
    select: { id: true, active: true },
  });
  await recordAudit({
    action: updated.active ? 'ENABLE_USER' : 'DISABLE_USER',
    entity: 'User',
    entityId: user.id,
    userId: req.user.id,
    ip: req.ip,
  });
  return ok(res, updated);
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  await recordAudit({ action: 'DELETE', entity: 'User', entityId: req.params.id, userId: req.user.id, ip: req.ip });
  return ok(res, { message: 'User deleted' });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.action) where.action = req.query.action;
  if (req.query.entity) where.entity = req.query.entity;
  if (req.query.q) {
    where.OR = [
      { action: { contains: req.query.q, mode: 'insensitive' } },
      { entity: { contains: req.query.q, mode: 'insensitive' } },
      { meta: { contains: req.query.q, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Flatten the joined user and metadata into the shape the audit table shows.
  const shaped = items.map((log) => {
    let description = `${log.action} on ${log.entity}`;
    if (log.meta) {
      try {
        const meta = JSON.parse(log.meta);
        const parts = Object.entries(meta).map(([k, v]) => `${k}: ${v}`);
        if (parts.length) description += ` (${parts.join(', ')})`;
      } catch {
        description += ` (${log.meta})`;
      }
    }
    return {
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      description,
      ipAddress: log.ip,
      actorRole: log.user?.role || 'SYSTEM',
      actor: log.user ? { name: log.user.name, email: log.user.email } : null,
      createdAt: log.createdAt,
    };
  });

  return ok(res, { items: shaped, total, page, limit, pages: Math.ceil(total / limit) });
});
