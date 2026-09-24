import { prisma } from '../config/prisma.js';
import { asyncHandler, ok, paginate } from '../utils/helpers.js';
import { recordAudit } from '../services/audit.service.js';
import { sendMail } from '../services/mailer.service.js';
import { getSettings } from '../services/settings.service.js';
import { scanShortageAlerts } from '../services/attendance.service.js';

export const listAlerts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status && req.query.status !== 'ALL') where.status = req.query.status;
  if (req.query.severity) where.severity = req.query.severity;
  if (req.query.isRead !== undefined) where.isRead = req.query.isRead === 'true';
  if (req.query.studentId) where.studentId = req.query.studentId;

  const [items, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { name: true, email: true } }, class: { select: { name: true, section: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

/** Alerts addressed to the current student (or their ward for parents). */
export const myAlerts = asyncHandler(async (req, res) => {
  let studentIds = [];
  const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
  if (student) studentIds = [student.id];
  if (req.user.role === 'PARENT') {
    const parent = await prisma.parent.findFirst({
      where: { userId: req.user.id },
      include: { students: true },
    });
    if (parent) studentIds = parent.students.map((s) => s.id);
  }

  const items = await prisma.alert.findMany({
    where: { studentId: { in: studentIds } },
    include: { student: { select: { rollNumber: true, user: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok(res, items);
});

export const markAlertRead = asyncHandler(async (req, res) => {
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  return ok(res, alert);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
  if (!student) return ok(res, { updated: 0 });
  const result = await prisma.alert.updateMany({
    where: { studentId: student.id, isRead: false },
    data: { isRead: true },
  });
  return ok(res, { updated: result.count });
});

/** Manual close of an alert, e.g. after the student has met their mentor. */
export const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: { status: 'RESOLVED', resolvedAt: new Date(), isRead: true },
  });
  await recordAudit({
    action: 'RESOLVE_ALERT',
    entity: 'Alert',
    entityId: alert.id,
    userId: req.user.id,
    ip: req.ip,
  });
  return ok(res, alert);
});

/** Re-scan every student and reconcile open/resolved shortage alerts. */
export const regenerateAlerts = asyncHandler(async (req, res) => {
  const result = await scanShortageAlerts();
  await recordAudit({
    action: 'SCAN_ALERTS',
    entity: 'Alert',
    meta: result,
    userId: req.user.id,
    ip: req.ip,
  });
  return ok(res, result);
});

/** Sends warning emails for every open shortage alert. */
export const notifyAlerts = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const alerts = await prisma.alert.findMany({
    where: { type: 'SHORTAGE', status: 'OPEN' },
    include: { student: { include: { user: true, parent: { include: { user: true } } } } },
  });

  let sent = 0;
  for (const a of alerts) {
    const text =
      `Dear ${a.student.user.name}, your attendance is ${a.percentage}%, which is below the required ` +
      `${a.threshold}%. Please meet your mentor to discuss improvement.`;
    await sendMail({ to: a.student.user.email, subject: 'Low attendance warning', text });
    if (settings.enableParentNotifications && a.student.parent?.user?.email) {
      await sendMail({
        to: a.student.parent.user.email,
        subject: `Low attendance warning for ${a.student.user.name}`,
        text,
      });
    }
    await prisma.alert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
    sent += 1;
  }

  await recordAudit({
    action: 'NOTIFY_ALERTS',
    entity: 'Alert',
    meta: { sent },
    userId: req.user.id,
    ip: req.ip,
  });
  return ok(res, { notified: sent, emailEnabled: settings.enableEmailAlerts });
});
