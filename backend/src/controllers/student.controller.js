import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler, ok, paginate } from '../utils/helpers.js';
import { recordAudit } from '../services/audit.service.js';
import { studentAttendanceSummary } from '../services/attendance.service.js';

const studentInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, active: true } },
  class: { select: { id: true, name: true, section: true, semester: true, academicYear: true } },
  department: { select: { id: true, name: true, code: true } },
  parent: { include: { user: { select: { name: true, email: true, phone: true } } } },
};

export const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.classId) where.classId = req.query.classId;
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.q) {
    where.OR = [
      { rollNumber: { contains: req.query.q, mode: 'insensitive' } },
      { user: { name: { contains: req.query.q, mode: 'insensitive' } } },
      { user: { email: { contains: req.query.q, mode: 'insensitive' } } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where, include: studentInclude, orderBy: { rollNumber: 'asc' }, skip, take: limit,
    }),
    prisma.student.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: studentInclude,
  });
  if (!student) throw new ApiError(404, 'Student not found');
  return ok(res, student);
});

export const createStudent = asyncHandler(async (req, res) => {
  const {
    name, email, rollNumber, phone, guardianName, guardianPhone,
    classId, departmentId, admissionYear, password,
  } = req.body;

  if (await prisma.user.findUnique({ where: { email: email.toLowerCase() } })) {
    throw new ApiError(409, 'Email already registered');
  }
  if (await prisma.student.findUnique({ where: { rollNumber } })) {
    throw new ApiError(409, 'Roll number already exists');
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(password || rollNumber, 10),
        role: 'STUDENT',
        phone: phone || null,
      },
    });
    return tx.student.create({
      data: {
        rollNumber,
        admissionYear: Number(admissionYear) || new Date().getFullYear(),
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
        userId: user.id,
        classId,
        departmentId,
      },
      include: studentInclude,
    });
  });

  await recordAudit({ action: 'CREATE', entity: 'Student', entityId: result.id, meta: { rollNumber }, userId: req.user.id, ip: req.ip });
  return ok(res, result, 201);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, guardianName, guardianPhone, classId, departmentId, admissionYear } = req.body;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new ApiError(404, 'Student not found');

  const result = await prisma.$transaction(async (tx) => {
    if (name || email || phone) {
      await tx.user.update({
        where: { id: student.userId },
        data: {
          ...(name ? { name } : {}),
          ...(email ? { email: email.toLowerCase().trim() } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
    }
    return tx.student.update({
      where: { id },
      data: {
        ...(guardianName !== undefined ? { guardianName } : {}),
        ...(guardianPhone !== undefined ? { guardianPhone } : {}),
        ...(classId ? { classId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(admissionYear ? { admissionYear: Number(admissionYear) } : {}),
      },
      include: studentInclude,
    });
  });

  await recordAudit({ action: 'UPDATE', entity: 'Student', entityId: id, userId: req.user.id, ip: req.ip });
  return ok(res, result);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) throw new ApiError(404, 'Student not found');
  // Deleting the user cascades to the student record and their attendance.
  await prisma.user.delete({ where: { id: student.userId } });
  await recordAudit({ action: 'DELETE', entity: 'Student', entityId: req.params.id, userId: req.user.id, ip: req.ip });
  return ok(res, { message: 'Student deleted' });
});

/** Bulk import: array of student objects sharing the class/department. */
export const bulkImportStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    throw new ApiError(400, 'students must be a non-empty array');
  }
  const created = [];
  const errors = [];

  for (const [index, row] of students.entries()) {
    try {
      const user = await prisma.user.create({
        data: {
          name: row.name,
          email: String(row.email).toLowerCase().trim(),
          password: await bcrypt.hash(row.password || row.rollNumber, 10),
          role: 'STUDENT',
          phone: row.phone || null,
        },
      });
      const student = await prisma.student.create({
        data: {
          rollNumber: String(row.rollNumber),
          admissionYear: Number(row.admissionYear) || new Date().getFullYear(),
          guardianName: row.guardianName || null,
          guardianPhone: row.guardianPhone || null,
          userId: user.id,
          classId: row.classId,
          departmentId: row.departmentId,
        },
      });
      created.push(student);
    } catch (err) {
      errors.push({ index, rollNumber: row.rollNumber, error: err.message });
    }
  }

  await recordAudit({ action: 'BULK_IMPORT', entity: 'Student', meta: { created: created.length, failed: errors.length }, userId: req.user.id, ip: req.ip });
  return ok(res, { created: created.length, failed: errors.length, errors }, 201);
});

/** Student/parent self-service: own attendance summary + calendar records. */
export const myAttendance = asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
  if (!student) throw new ApiError(404, 'No student profile linked to this account');
  const summary = await studentAttendanceSummary(student.id);
  const records = await prisma.attendance.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { date: 'desc' },
    take: 200,
  });
  return ok(res, { ...summary, records });
});

export const myLeaves = asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { userId: req.user.id } });
  if (!student) throw new ApiError(404, 'No student profile linked to this account');
  const items = await prisma.leaveRequest.findMany({
    where: { studentId: student.id },
    orderBy: { appliedAt: 'desc' },
  });
  return ok(res, items);
});

/** Parent portal: all wards linked to this parent account. */
export const myWards = asyncHandler(async (req, res) => {
  const parent = await prisma.parent.findFirst({
    where: { userId: req.user.id },
    include: { students: { include: studentInclude } },
  });
  if (!parent) throw new ApiError(404, 'No parent profile linked to this account');
  const wards = await Promise.all(
    parent.students.map(async (s) => ({ student: s, summary: await studentAttendanceSummary(s.id) })),
  );
  return ok(res, wards);
});
