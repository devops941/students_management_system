import { prisma } from '../config/prisma.js';
import { asyncHandler, ok, toDateOnly, round2 } from '../utils/helpers.js';
import { percentageOf, statusCounts } from '../services/attendance.service.js';
import { getSettings, readSettings } from '../services/settings.service.js';

const daysAgo = (n) => {
  const d = toDateOnly(new Date());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

/** Admin dashboard: headline counts, today snapshot and a 14-day trend. */
export const adminDashboard = asyncHandler(async (_req, res) => {
  const today = toDateOnly(new Date());
  const settings = await getSettings();

  const [students, faculty, departments, courses, classes, subjects, pendingLeaves, users] =
    await Promise.all([
      prisma.student.count(),
      prisma.faculty.count(),
      prisma.department.count(),
      prisma.course.count(),
      prisma.classRoom.count(),
      prisma.subject.count(),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
    ]);

  const [todayRecords, trendRecords, openAlertCount, recentAlerts] = await Promise.all([
    prisma.attendance.findMany({ where: { date: today } }),
    prisma.attendance.findMany({ where: { date: { gte: daysAgo(13) } } }),
    prisma.alert.count({ where: { type: 'SHORTAGE', status: 'OPEN' } }),
    prisma.alert.findMany({
      where: { type: 'SHORTAGE', status: 'OPEN' },
      include: { student: { include: { user: { select: { name: true } }, class: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const todayCounts = statusCounts(todayRecords);
  const trendMap = new Map();
  for (const r of trendRecords) {
    const key = r.date.toISOString().slice(0, 10);
    if (!trendMap.has(key)) trendMap.set(key, []);
    trendMap.get(key).push(r);
  }
  const trend = [...trendMap.entries()]
    .map(([date, rows]) => ({ date, percentage: percentageOf(statusCounts(rows)), total: rows.length }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return ok(res, {
    counts: {
      students, faculty, departments, courses, classes, subjects, users,
      pendingLeaves, openAlerts: openAlertCount,
    },
    today: { date: today.toISOString().slice(0, 10), ...todayCounts, percentage: percentageOf(todayCounts) },
    trend,
    threshold: settings.minAttendancePercent,
    recentAlerts,
  });
});

/** Faculty dashboard: their workload, subjects, schedule and recent activity. */
export const facultyDashboard = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const faculty = await prisma.faculty.findFirst({
    where: { userId: req.user.id },
    include: {
      department: true,
      user: { select: { name: true, email: true } },
      subjects: { include: { course: true } },
      timetable: {
        include: { class: true, subject: true },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      },
    },
  });

  if (!faculty) {
    return ok(res, {
      faculty: null,
      counts: { subjects: 0, classes: 0, students: 0, pendingLeaves: 0 },
      subjects: [],
      classes: [],
      todaysSchedule: [],
      trend: [],
      recentSessions: [],
      threshold: settings.minAttendancePercent,
    });
  }

  const classIds = [...new Set(faculty.timetable.map((t) => t.classId))];
  const subjectIds = faculty.subjects.map((s) => s.id);
  const today = toDateOnly(new Date());
  const dow = today.getUTCDay();

  const [pendingLeaves, studentCount, myRecords, recent] = await Promise.all([
    prisma.leaveRequest.count({
      where: { status: 'PENDING', student: { classId: { in: classIds } } },
    }),
    classIds.length ? prisma.student.count({ where: { classId: { in: classIds } } }) : 0,
    prisma.attendance.findMany({
      where: { subjectId: { in: subjectIds }, date: { gte: daysAgo(13) } },
    }),
    prisma.attendance.findMany({
      where: { facultyId: faculty.id },
      include: { subject: { select: { name: true } }, class: { select: { name: true, section: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  // Group the recent records into distinct marked sessions.
  const seen = new Map();
  for (const r of recent) {
    const key = `${r.date.toISOString().slice(0, 10)}|${r.subjectId}|${r.period}`;
    if (!seen.has(key)) {
      seen.set(key, {
        date: r.date,
        period: r.period,
        subject: r.subject?.name,
        className: r.class ? `${r.class.name}-${r.class.section}` : '-',
        present: 0,
        total: 0,
      });
    }
    const session = seen.get(key);
    session.total += 1;
    if (r.status !== 'ABSENT') session.present += 1;
  }

  const trendMap = new Map();
  for (const r of myRecords) {
    const key = r.date.toISOString().slice(0, 10);
    if (!trendMap.has(key)) trendMap.set(key, []);
    trendMap.get(key).push(r);
  }
  const trend = [...trendMap.entries()]
    .map(([date, rows]) => ({ date, percentage: percentageOf(statusCounts(rows)), total: rows.length }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Average attendance per subject for quick comparison.
  const perSubject = new Map();
  for (const r of myRecords) {
    if (!perSubject.has(r.subjectId)) perSubject.set(r.subjectId, []);
    perSubject.get(r.subjectId).push(r);
  }
  const subjects = faculty.subjects.map((s) => {
    const rows = perSubject.get(s.id) || [];
    const counts = statusCounts(rows);
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      semester: s.semester,
      averagePercentage: rows.length ? percentageOf(counts) : 0,
      records: rows.length,
    };
  });

  return ok(res, {
    faculty: {
      id: faculty.id,
      employeeCode: faculty.employeeCode,
      designation: faculty.designation,
      department: faculty.department,
      user: faculty.user,
    },
    counts: {
      subjects: faculty.subjects.length,
      classes: classIds.length,
      students: studentCount,
      pendingLeaves,
    },
    subjects,
    classes: classIds.map((id) => faculty.timetable.find((t) => t.classId === id).class),
    todaysSchedule: faculty.timetable.filter((t) => t.dayOfWeek === dow),
    trend,
    recentSessions: [...seen.values()].slice(0, 6),
    threshold: settings.minAttendancePercent,
  });
});

/** Read the persisted settings, normalised into typed values. */
export const settingsController = {
  get: asyncHandler(async (_req, res) => {
    const settings = await getSettings();
    return ok(res, {
      minAttendancePercent: settings.minAttendancePercent,
      attendanceEditWindowHours: settings.editWindowHours,
      lowAttendanceSeverity: settings.lowAttendanceSeverity,
      enableEmailAlerts: settings.enableEmailAlerts,
      enableParentNotifications: settings.enableParentNotifications,
      academicYear: settings.academicYear,
      institutionName: settings.institutionName,
      raw: settings.raw,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const allowed = [
      'minAttendancePercent',
      'attendanceEditWindowHours',
      'lowAttendanceSeverity',
      'enableEmailAlerts',
      'enableParentNotifications',
      'academicYear',
      'institutionName',
    ];
    const entries = Object.entries(req.body || {}).filter(([key]) => allowed.includes(key));
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    const settings = await getSettings();
    const parsed = {
      minAttendancePercent: settings.minAttendancePercent,
      attendanceEditWindowHours: settings.editWindowHours,
      lowAttendanceSeverity: settings.lowAttendanceSeverity,
      enableEmailAlerts: settings.enableEmailAlerts,
      enableParentNotifications: settings.enableParentNotifications,
      academicYear: settings.academicYear,
      institutionName: settings.institutionName,
    };
    // Keep percentage values numeric so the UI can round-trip them safely.
    return ok(res, {
      ...parsed,
      minAttendancePercent: round2(parsed.minAttendancePercent),
      raw: settings.raw,
    });
  }),
};

export { readSettings };
