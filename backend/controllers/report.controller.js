import { prisma } from '../config/prisma.js';
import env from '../config/env.js';
import { asyncHandler, ok, toDateOnly } from '../utils/helpers.js';
import { percentageOf, statusCounts, studentAttendanceSummary } from '../services/attendance.service.js';
import { exportExcel, exportPdf } from '../services/export.service.js';
import { getSettings } from '../services/settings.service.js';

const rangeWhere = (req) => {
  const where = {};
  if (req.query.classId) where.classId = req.query.classId;
  if (req.query.subjectId) where.subjectId = req.query.subjectId;
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = toDateOnly(req.query.from);
    if (req.query.to) where.date.lte = toDateOnly(req.query.to);
  }
  return where;
};

const subjectName = (s) => (s ? `${s.name} (${s.code})` : '-');

/** Daily attendance totals for a class/subject over a range. */
export const dailyReport = asyncHandler(async (req, res) => {
  const records = await prisma.attendance.findMany({ where: rangeWhere(req) });
  const map = new Map();
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  const items = [...map.entries()]
    .map(([date, rows]) => ({ date, ...statusCounts(rows), percentage: percentageOf(statusCounts(rows)) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return ok(res, items);
});

/** Subject-wise attendance breakdown for a class. */
export const subjectWiseReport = asyncHandler(async (req, res) => {
  const records = await prisma.attendance.findMany({
    where: rangeWhere(req),
    include: { subject: { select: { name: true, code: true } } },
  });
  const map = new Map();
  for (const r of records) {
    const key = r.subjectId;
    if (!map.has(key)) map.set(key, { subject: r.subject, rows: [] });
    map.get(key).rows.push(r);
  }
  const items = [...map.values()].map(({ subject, rows }) => {
    const counts = statusCounts(rows);
    return { subjectId: rows[0].subjectId, subject: subjectName(subject), ...counts, percentage: percentageOf(counts) };
  });
  items.sort((a, b) => b.percentage - a.percentage);
  return ok(res, items);
});

/** Monthly attendance percentages (across all or filtered records). */
export const monthlyReport = asyncHandler(async (req, res) => {
  const records = await prisma.attendance.findMany({ where: rangeWhere(req) });
  const map = new Map();
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  const items = [...map.entries()]
    .map(([month, rows]) => ({ month, ...statusCounts(rows), percentage: percentageOf(statusCounts(rows)) }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return ok(res, items);
});

/** Class-wide student ranking with attendance percentage. */
export const classReport = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  if (!classId) return ok(res, []);
  const students = await prisma.student.findMany({
    where: { classId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { rollNumber: 'asc' },
  });
  const items = [];
  for (const s of students) {
    const summary = await studentAttendanceSummary(s.id);
    items.push({
      studentId: s.id,
      rollNumber: s.rollNumber,
      name: s.user.name,
      email: s.user.email,
      ...summary.overall,
    });
  }
  return ok(res, items);
});

const toRows = (items, columns) => items.map((it) => columns.map((c) => it[c.key]));

export const exportReport = asyncHandler(async (req, res) => {
  const { format = 'excel' } = req.query;
  // Accept both the report page names and short aliases.
  const alias = { 'subject-wise': 'subject', subjectWise: 'subject', class: 'summary' };
  const type = alias[req.query.type] || req.query.type || 'daily';
  const settings = await getSettings();
  const threshold = settings.minAttendancePercent;
  let title = 'Attendance Report';
  let headers = [];
  let rows = [];

  if (type === 'daily') {
    const records = await prisma.attendance.findMany({ where: rangeWhere(req) });
    const map = new Map();
    for (const r of records) {
      const key = r.date.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    headers = ['Date', 'Present', 'Absent', 'Late', 'On Duty', 'Total', 'Percentage'];
    rows = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, rs]) => {
        const c = statusCounts(rs);
        return [date, c.present, c.absent, c.late, c.onDuty, c.total, `${percentageOf(c)}%`];
      });
    title = 'Daily Attendance Report';
  } else if (type === 'subject') {
    const records = await prisma.attendance.findMany({
      where: rangeWhere(req),
      include: { subject: { select: { name: true, code: true } } },
    });
    const map = new Map();
    for (const r of records) {
      const key = r.subjectId;
      if (!map.has(key)) map.set(key, { subject: r.subject, rows: [] });
      map.get(key).rows.push(r);
    }
    headers = ['Subject', 'Present', 'Absent', 'Late', 'On Duty', 'Total', 'Percentage'];
    rows = [...map.values()].map(({ subject, rows: rs }) => {
      const c = statusCounts(rs);
      return [subjectName(subject), c.present, c.absent, c.late, c.onDuty, c.total, `${percentageOf(c)}%`];
    });
    title = 'Subject-wise Attendance Report';
  } else if (type === 'defaulters') {
    const students = await prisma.student.findMany({
      where: req.query.classId ? { classId: req.query.classId } : {},
      include: { user: { select: { name: true, email: true } }, class: true },
    });
    headers = ['Roll No', 'Name', 'Email', 'Class', 'Present', 'Absent', 'Total', 'Percentage'];
    for (const s of students) {
      const summary = await studentAttendanceSummary(s.id);
      if (summary.overall.total === 0) continue;
      if (summary.overall.percentage < threshold) {
        rows.push([
          s.rollNumber, s.user.name, s.user.email, `${s.class.name}-${s.class.section}`,
          summary.overall.present, summary.overall.absent, summary.overall.total,
          `${summary.overall.percentage}%`,
        ]);
      }
    }
    rows.sort((a, b) => parseFloat(a[7]) - parseFloat(b[7]));
    title = `Defaulter Report (below ${threshold}%)`;
  } else {
    headers = ['Roll No', 'Name', 'Present', 'Absent', 'Total', 'Percentage'];
    const students = await prisma.student.findMany({
      where: req.query.classId ? { classId: req.query.classId } : {},
      include: { user: { select: { name: true } } },
      orderBy: { rollNumber: 'asc' },
    });
    for (const s of students) {
      const summary = await studentAttendanceSummary(s.id);
      rows.push([s.rollNumber, s.user.name, summary.overall.present, summary.overall.absent, summary.overall.total, `${summary.overall.percentage}%`]);
    }
    title = 'Student Attendance Summary';
  }

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'pdf') {
    const buffer = await exportPdf({ title, subtitle: `Generated ${stamp}`, headers, rows });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${stamp}.pdf"`);
    return res.send(buffer);
  }
  const buffer = exportExcel({ headers, rows, sheetName: type });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${stamp}.xlsx"`);
  return res.send(buffer);
});
