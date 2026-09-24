import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler, ok, paginate } from '../utils/helpers.js';
import { recordAudit } from '../services/audit.service.js';

const facultyInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, active: true } },
  department: { select: { id: true, name: true, code: true } },
  subjects: { select: { id: true, name: true, code: true, semester: true } },
};

export const listFaculty = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const where = {};
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.q) {
    where.OR = [
      { employeeCode: { contains: req.query.q, mode: 'insensitive' } },
      { user: { name: { contains: req.query.q, mode: 'insensitive' } } },
      { user: { email: { contains: req.query.q, mode: 'insensitive' } } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.faculty.findMany({
      where, include: facultyInclude, orderBy: { employeeCode: 'asc' }, skip, take: limit,
    }),
    prisma.faculty.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const getFaculty = asyncHandler(async (req, res) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id }, include: facultyInclude });
  if (!faculty) throw new ApiError(404, 'Faculty not found');
  return ok(res, faculty);
});

export const createFaculty = asyncHandler(async (req, res) => {
  const { name, email, employeeCode, designation, departmentId, phone, password } = req.body;
  if (await prisma.user.findUnique({ where: { email: email.toLowerCase() } })) {
    throw new ApiError(409, 'Email already registered');
  }
  if (await prisma.faculty.findUnique({ where: { employeeCode } })) {
    throw new ApiError(409, 'Employee code already exists');
  }
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(password || employeeCode, 10),
        role: 'FACULTY',
        phone: phone || null,
      },
    });
    return tx.faculty.create({
      data: {
        employeeCode,
        designation: designation || 'Assistant Professor',
        departmentId,
        userId: user.id,
      },
      include: facultyInclude,
    });
  });
  await recordAudit({ action: 'CREATE', entity: 'Faculty', entityId: result.id, meta: { employeeCode }, userId: req.user.id, ip: req.ip });
  return ok(res, result, 201);
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, designation, departmentId } = req.body;
  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) throw new ApiError(404, 'Faculty not found');

  const result = await prisma.$transaction(async (tx) => {
    if (name || email || phone) {
      await tx.user.update({
        where: { id: faculty.userId },
        data: {
          ...(name ? { name } : {}),
          ...(email ? { email: email.toLowerCase().trim() } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
    }
    return tx.faculty.update({
      where: { id },
      data: {
        ...(designation ? { designation } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: facultyInclude,
    });
  });
  await recordAudit({ action: 'UPDATE', entity: 'Faculty', entityId: id, userId: req.user.id, ip: req.ip });
  return ok(res, result);
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
  if (!faculty) throw new ApiError(404, 'Faculty not found');
  await prisma.user.delete({ where: { id: faculty.userId } });
  await recordAudit({ action: 'DELETE', entity: 'Faculty', entityId: req.params.id, userId: req.user.id, ip: req.ip });
  return ok(res, { message: 'Faculty deleted' });
});

/** Subjects + classes assigned to the logged-in faculty member. */
export const myAssignments = asyncHandler(async (req, res) => {
  const faculty = await prisma.faculty.findFirst({
    where: { userId: req.user.id },
    include: {
      subjects: { include: { course: { include: { classes: true } } } },
      timetable: {
        include: {
          class: true,
          subject: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      },
    },
  });
  if (!faculty) throw new ApiError(404, 'No faculty profile linked to this account');

  // Distinct classes this faculty teaches via subjects or timetable.
  const classMap = new Map();
  for (const t of faculty.timetable) classMap.set(t.class.id, t.class);
  for (const s of faculty.subjects) {
    for (const c of s.course.classes) classMap.set(c.id, c);
  }

  return ok(res, {
    faculty: { id: faculty.id, employeeCode: faculty.employeeCode, designation: faculty.designation },
    subjects: faculty.subjects,
    classes: [...classMap.values()],
    timetable: faculty.timetable,
  });
});
