import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler, ok, paginate, toDateOnly } from '../utils/helpers.js';
import { recordAudit } from '../services/audit.service.js';
import { refreshShortageAlert, studentAttendanceSummary } from '../services/attendance.service.js';
import { getSettings } from '../services/settings.service.js';
import { sendMail } from '../services/mailer.service.js';

const attendanceInclude = {
  student: { include: { user: { select: { name: true, email: true } } } },
  subject: { select: { id: true, name: true, code: true } },
  class: { select: { id: true, name: true, section: true } },
  faculty: { include: { user: { select: { name: true } } } },
};

/** Faculty session roster: students in a class with their current status. */
export const sessionRoster = asyncHandler(async (req, res) => {
  const { classId, subjectId, date, period } = req.query;
  if (!classId || !subjectId || !date) {
    throw new ApiError(400, 'classId, subjectId and date are required');
  }
  const day = toDateOnly(date);
  const students = await prisma.student.findMany({
    where: { classId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { rollNumber: 'asc' },
  });
  const where = { classId, subjectId, date: day };
  if (period) where.period = Number(period);
  const existing = await prisma.attendance.findMany({ where });
  const byStudent = new Map(existing.map((a) => [a.studentId, a]));

  return ok(
    res,
    students.map((s) => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      name: s.user.name,
      status: byStudent.get(s.id)?.status || null,
      attendanceId: byStudent.get(s.id)?.id || null,
      remarks: byStudent.get(s.id)?.remarks || '',
    })),
  );
});

/**
 * Upsert a whole period's attendance in one call. Rejects edits outside the
 * configured edit window so past records cannot be silently rewritten.
 */
export const markAttendance = asyncHandler(async (req, res) => {
  const { classId, subjectId, date, period, records } = req.body;
  if (!classId || !subjectId || !date || !Array.isArray(records)) {
    throw new ApiError(400, 'classId, subjectId, date and records[] are required');
  }
  if (records.length === 0) throw new ApiError(400, 'No attendance records supplied');

  const faculty = await prisma.faculty.findFirst({ where: { userId: req.user.id } });
  const facultyId = faculty?.id || (await prisma.faculty.findFirst())?.id;
  if (!facultyId) throw new ApiError(400, 'No faculty profile available to attribute attendance');

  const settings = await getSettings();
  const day = toDateOnly(date);
  const periodNum = period ? Number(period) : null;
  const saved = [];

  for (const rec of records) {
    if (!rec.studentId || !rec.status) continue;
    const existing = await prisma.attendance.findFirst({
      where: { studentId: rec.studentId, subjectId, date: day, period: periodNum },
    });

    if (existing) {
      const ageHours = (Date.now() - new Date(existing.createdAt).getTime()) / 3.6e6;
      if (ageHours > settings.editWindowHours && req.user.role !== 'ADMIN') {
        throw new ApiError(
          403,
          `Edit window of ${settings.editWindowHours}h passed for this record. Ask admin to correct it.`,
        );
      }
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: rec.status, remarks: rec.remarks || null, markedById: req.user.id },
        include: attendanceInclude,
      });
      saved.push(updated);
      await recordAudit({
        action: 'EDIT_ATTENDANCE',
        entity: 'Attendance',
        entityId: existing.id,
        meta: { from: existing.status, to: rec.status },
        userId: req.user.id,
        ip: req.ip,
      });
    } else {
      const created = await prisma.attendance.create({
        data: {
          date: day,
          period: periodNum,
          status: rec.status,
          remarks: rec.remarks || null,
          studentId: rec.studentId,
          classId,
          subjectId,
          facultyId,
          markedById: req.user.id,
        },
        include: attendanceInclude,
      });
      saved.push(created);
    }
  }

  // Recalculate shortage alerts for every affected student.
  const affected = [...new Set(records.map((r) => r.studentId))];
  const alerts = [];
  for (const studentId of affected) {
    const alert = await refreshShortageAlert(studentId);
    if (alert) alerts.push(alert);
  }

  return ok(res, { saved: saved.length, alertsRaised: alerts.length, alerts }, 201);
});

/** Generic queryable attendance list for admin/reports. */
export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.classId) where.classId = req.query.classId;
  if (req.query.subjectId) where.subjectId = req.query.subjectId;
  if (req.query.studentId) where.studentId = req.query.studentId;
  if (req.query.facultyId) where.facultyId = req.query.facultyId;
  if (req.query.status) where.status = req.query.status;
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = toDateOnly(req.query.from);
    if (req.query.to) where.date.lte = toDateOnly(req.query.to);
  }
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where, include: attendanceInclude, orderBy: { date: 'desc' }, skip, take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const existing = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Attendance record not found');
  const settings = await getSettings();
  const ageHours = (Date.now() - new Date(existing.createdAt).getTime()) / 3.6e6;
  if (ageHours > settings.editWindowHours && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Edit window has passed for this record');
  }
  const updated = await prisma.attendance.update({
    where: { id: req.params.id },
    data: { status: req.body.status, remarks: req.body.remarks ?? existing.remarks },
    include: attendanceInclude,
  });
  await refreshShortageAlert(existing.studentId);
  await recordAudit({
    action: 'EDIT_ATTENDANCE',
    entity: 'Attendance',
    entityId: existing.id,
    meta: { from: existing.status, to: updated.status },
    userId: req.user.id,
    ip: req.ip,
  });
  return ok(res, updated);
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  const existing = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Attendance record not found');
  await prisma.attendance.delete({ where: { id: req.params.id } });
  await refreshShortageAlert(existing.studentId);
  await recordAudit({ action: 'DELETE_ATTENDANCE', entity: 'Attendance', entityId: req.params.id, userId: req.user.id, ip: req.ip });
  return ok(res, { message: 'Attendance deleted' });
});

/** Admin/faculty view of one student's full attendance profile. */
export const studentSummary = asyncHandler(async (req, res) => {
  const summary = await studentAttendanceSummary(req.params.studentId);
  if (!summary) throw new ApiError(404, 'Student not found');
  return ok(res, summary);
});

/** Defaulter list: everyone below the minimum percentage. */
export const defaulters = asyncHandler(async (req, res) => {
  const { classId, departmentId } = req.query;
  const settings = await getSettings();
  const threshold = Number(req.query.threshold || settings.minAttendancePercent);
  const studentWhere = {};
  if (classId) studentWhere.classId = classId;
  if (departmentId) studentWhere.departmentId = departmentId;

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: { user: { select: { name: true, email: true, phone: true } }, class: true, parent: { include: { user: { select: { email: true, phone: true } } } } },
  });

  const rows = [];
  for (const s of students) {
    const summary = await studentAttendanceSummary(s.id);
    if (summary.overall.total === 0) continue;
    if (summary.overall.percentage < threshold) {
      rows.push({
        studentId: s.id,
        rollNumber: s.rollNumber,
        name: s.user.name,
        email: s.user.email,
        phone: s.user.phone,
        class: `${s.class.name}-${s.class.section}`,
        guardianEmail: s.parent?.user?.email || null,
        percentage: summary.overall.percentage,
        present: summary.overall.present,
        absent: summary.overall.absent,
        total: summary.overall.total,
      });
    }
  }
  rows.sort((a, b) => a.percentage - b.percentage);
  return ok(res, { threshold, count: rows.length, items: rows });
});

export const notifyDefaulters = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new ApiError(400, 'studentIds must be a non-empty array');
  }
  let sent = 0;
  for (const id of studentIds) {
    const summary = await studentAttendanceSummary(id);
    if (!summary) continue;
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true, parent: { include: { user: true } } },
    });
    const settings = await getSettings();
    const text = `Dear ${student.user.name}, your attendance is ${summary.overall.percentage}%, below the required ${settings.minAttendancePercent}%. Please meet your mentor.`;
    await sendMail({ to: student.user.email, subject: 'Low attendance warning', text });
    if (student.parent?.user?.email) {
      await sendMail({ to: student.parent.user.email, subject: 'Ward low attendance warning', text });
    }
    sent += 1;
  }
  await recordAudit({ action: 'NOTIFY_DEFAULTERS', entity: 'Attendance', meta: { sent }, userId: req.user.id, ip: req.ip });
  return ok(res, { notified: sent });
});
