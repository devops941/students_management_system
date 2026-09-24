import env from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { round2, toDateOnly } from '../utils/helpers.js';
import { getSettings, severityFor } from './settings.service.js';

/**
 * Present + Late + On-Duty all count as "attended" for percentage purposes;
 * Absent is the only status that reduces attendance.
 */
const ATTENDED = new Set(['PRESENT', 'LATE', 'ON_DUTY']);

export const statusCounts = (records) =>
  records.reduce(
    (acc, r) => {
      acc.total += 1;
      if (ATTENDED.has(r.status)) acc.attended += 1;
      if (r.status === 'ABSENT') acc.absent += 1;
      if (r.status === 'LATE') acc.late += 1;
      if (r.status === 'ON_DUTY') acc.onDuty += 1;
      if (r.status === 'PRESENT') acc.present += 1;
      return acc;
    },
    { total: 0, attended: 0, present: 0, absent: 0, late: 0, onDuty: 0 },
  );

export const percentageOf = (counts) =>
  counts.total === 0 ? 0 : round2((counts.attended / counts.total) * 100);

/** Overall + subject-wise attendance for one student. */
export async function studentAttendanceSummary(studentId) {
  const [records, student] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId },
      include: { subject: { select: { id: true, name: true, code: true } } },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  if (!student) return null;

  const overall = statusCounts(records);
  const bySubjectMap = new Map();
  for (const r of records) {
    const key = r.subjectId;
    if (!bySubjectMap.has(key)) {
      bySubjectMap.set(key, {
        subjectId: key,
        subject: r.subject,
        records: [],
      });
    }
    bySubjectMap.get(key).records.push(r);
  }

  const subjects = [...bySubjectMap.values()].map((s) => {
    const counts = statusCounts(s.records);
    return {
      subjectId: s.subjectId,
      name: s.subject?.name,
      code: s.subject?.code,
      ...counts,
      percentage: percentageOf(counts),
    };
  });

  const settings = await getSettings();
  const overallPercent = percentageOf(overall);
  return {
    student: {
      id: student.id,
      rollNumber: student.rollNumber,
      name: student.user?.name,
      email: student.user?.email,
      class: student.class,
    },
    overall: { ...overall, percentage: overallPercent },
    subjects: subjects.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    threshold: settings.minAttendancePercent,
    eligible: overallPercent >= settings.minAttendancePercent,
  };
}

/** Recompute shortage state for one student and upsert/clear the alert. */
export async function refreshShortageAlert(studentId) {
  const summary = await studentAttendanceSummary(studentId);
  if (!summary || summary.overall.total === 0) return null;

  const { percentage } = summary.overall;
  const settings = await getSettings();
  const threshold = settings.minAttendancePercent;
  const existing = await prisma.alert.findFirst({
    where: { studentId, type: 'SHORTAGE', status: 'OPEN' },
  });

  if (percentage < threshold) {
    const severity = severityFor(percentage, threshold, settings.lowAttendanceSeverity);
    const message = `Attendance ${percentage}% is below the required ${threshold}%. Exam eligibility at risk.`;
    if (existing) {
      return prisma.alert.update({
        where: { id: existing.id },
        data: { percentage, threshold, message, severity },
      });
    }
    return prisma.alert.create({
      data: { studentId, type: 'SHORTAGE', severity, percentage, threshold, message },
    });
  }

  if (existing) {
    return prisma.alert.update({
      where: { id: existing.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }
  return null;
}

/**
 * Batch scan used by the admin "run scan" action: raises alerts for students
 * who are below the threshold and auto-resolves alerts for students who have
 * since recovered.
 */
export async function scanShortageAlerts() {
  const settings = await getSettings();
  const students = await prisma.student.findMany({ select: { id: true } });
  let created = 0;
  let resolved = 0;

  for (const { id } of students) {
    const before = await prisma.alert.findFirst({ where: { studentId: id, type: 'SHORTAGE', status: 'OPEN' } });
    const alert = await refreshShortageAlert(id);
    if (alert && alert.status === 'OPEN' && !before) created += 1;
    if (alert && alert.status === 'RESOLVED') resolved += 1;
  }
  return { created, resolved, threshold: settings.minAttendancePercent, scanned: students.length };
}

/** Attendance rows for a class + subject on a date (used by marking screen). */
export async function classSessionAttendance({ classId, subjectId, date, period }) {
  const day = toDateOnly(date);
  const where = { classId, subjectId, date: day };
  if (period !== undefined && period !== null && period !== '') {
    where.period = Number(period);
  }
  return prisma.attendance.findMany({ where });
}
