import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler, ok, paginate, toDateOnly } from '../utils/helpers.js';
import { recordAudit } from '../services/audit.service.js';
import { refreshShortageAlert } from '../services/attendance.service.js';
import { sendMail } from '../services/mailer.service.js';

const leaveInclude = {
  student: {
    include: {
      user: { select: { name: true, email: true } },
      class: { select: { name: true, section: true } },
    },
  },
  approvedBy: { select: { name: true, role: true } },
};

/** Returns the list of dates (YYYY-MM-DD) covered by a leave range. */
const eachDate = (from, to) => {
  const dates = [];
  const cursor = toDateOnly(from);
  const end = toDateOnly(to);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

export const listLeaves = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;
  if (req.query.studentId) where.studentId = req.query.studentId;
  if (req.query.classId) where.student = { classId: req.query.classId };

  // Faculty only sees requests for classes they teach (via timetable).
  if (req.user.role === 'FACULTY' && !req.query.all) {
    const faculty = await prisma.faculty.findFirst({ where: { userId: req.user.id } });
    const slots = faculty
      ? await prisma.timetable.findMany({ where: { facultyId: faculty.id }, select: { classId: true } })
      : [];
    where.student = { ...(where.student || {}), classId: { in: slots.map((s) => s.classId) } };
  }

  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({ where, include: leaveInclude, orderBy: { appliedAt: 'desc' }, skip, take: limit }),
    prisma.leaveRequest.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const applyLeave = asyncHandler(async (req, res) => {
  const { fromDate, toDate, reason, type = 'LEAVE' } = req.body;
  if (!fromDate || !toDate || !reason) {
    throw new ApiError(400, 'fromDate, toDate and reason are required');
  }
  if (toDateOnly(toDate) < toDateOnly(fromDate)) {
    throw new ApiError(400, 'toDate cannot be before fromDate');
  }

  // Students apply for themselves; admin/faculty may apply on behalf.
  let studentId = req.body.studentId;
  if (req.user.role === 'STUDENT' || !studentId) {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
    if (!student) throw new ApiError(404, 'No student profile linked to this account');
    studentId = student.id;
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      fromDate: toDateOnly(fromDate),
      toDate: toDateOnly(toDate),
      reason,
      type,
      studentId,
    },
    include: leaveInclude,
  });
  await recordAudit({ action: 'APPLY_LEAVE', entity: 'LeaveRequest', entityId: leave.id, userId: req.user.id, ip: req.ip });
  return ok(res, leave, 201);
});

/**
 * Approval flow. On approval for ON_DUTY / LEAVE where the type is ON_DUTY,
 * matching attendance days are auto-marked ON_DUTY and left-behind records
 * are created as ON_DUTY so percentages update immediately.
 */
export const decideLeave = asyncHandler(async (req, res) => {
  const { status, approverRemarks } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'status must be APPROVED or REJECTED');
  }
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'This request is already decided');

  const student = await prisma.student.findUnique({ where: { id: leave.studentId } });
  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: {
      status,
      approverRemarks: approverRemarks || null,
      approvedById: req.user.id,
      approvedAt: new Date(),
    },
    include: leaveInclude,
  });

  if (status === 'APPROVED') {
    // Mark every subject the student studies as ON_DUTY for the leave dates.
    const subjects = await prisma.subject.findMany({
      where: { course: { classes: { some: { id: student.classId } } } },
      select: { id: true },
    });
    const faculty = await prisma.faculty.findFirst({ where: { userId: req.user.id } });
    const facultyId = faculty?.id || (await prisma.faculty.findFirst())?.id;

    for (const date of eachDate(leave.fromDate, leave.toDate)) {
      for (const subject of subjects) {
        const existing = await prisma.attendance.findFirst({
          where: { studentId: student.id, subjectId: subject.id, date, period: null },
        });
        if (existing) {
          await prisma.attendance.update({
            where: { id: existing.id },
            data: { status: leave.type === 'ON_DUTY' ? 'ON_DUTY' : 'PRESENT', remarks: 'Auto-adjusted on leave approval' },
          });
        } else if (facultyId) {
          await prisma.attendance.create({
            data: {
              date,
              period: null,
              status: leave.type === 'ON_DUTY' ? 'ON_DUTY' : 'PRESENT',
              remarks: 'Auto-adjusted on leave approval',
              studentId: student.id,
              classId: student.classId,
              subjectId: subject.id,
              facultyId,
              markedById: req.user.id,
            },
          });
        }
      }
    }
    await refreshShortageAlert(student.id);
  }

  // Informational notification for the student; kept out of the admin's
  // open-alert queue since it needs no action.
  await prisma.alert.create({
    data: {
      studentId: student.id,
      type: 'LEAVE_STATUS',
      severity: 'LOW',
      status: 'RESOLVED',
      resolvedAt: new Date(),
      message: `Your ${leave.type} request was ${status.toLowerCase()}${approverRemarks ? `: ${approverRemarks}` : '.'}`,
      percentage: 0,
      threshold: 0,
    },
  }).catch(() => {});

  const studentUser = await prisma.user.findUnique({ where: { id: student.userId } });
  await sendMail({
    to: studentUser.email,
    subject: `Leave request ${status.toLowerCase()}`,
    text: `Your leave from ${leave.fromDate.toDateString()} to ${leave.toDate.toDateString()} was ${status.toLowerCase()}.`,
  });

  await recordAudit({ action: `LEAVE_${status}`, entity: 'LeaveRequest', entityId: leave.id, userId: req.user.id, ip: req.ip });
  return ok(res, updated);
});

export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'Only pending requests can be cancelled');
  await prisma.leaveRequest.delete({ where: { id: leave.id } });
  return ok(res, { message: 'Leave request cancelled' });
});

export const pendingCount = asyncHandler(async (_req, res) => {
  const count = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });
  return ok(res, { pending: count });
});
