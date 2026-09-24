import { Router } from 'express';
import { crudController } from '../controllers/crud.factory.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApiError } from '../utils/helpers.js';
import { prisma } from '../config/prisma.js';

const router = Router();
router.use(authenticate);

/* Departments */
const departments = crudController({
  model: 'department',
  entityName: 'Department',
  searchFields: ['name', 'code', 'hodName'],
  orderBy: { name: 'asc' },
  include: { _count: { select: { courses: true, faculty: true, students: true } } },
  validateCreate: (b) => {
    if (!b.name || !b.code) throw new ApiError(400, 'name and code are required');
  },
});
router.get('/departments', departments.list);
router.get('/departments/:id', departments.getOne);
router.post('/departments', authorize('ADMIN'), departments.create);
router.put('/departments/:id', authorize('ADMIN'), departments.update);
router.delete('/departments/:id', authorize('ADMIN'), departments.remove);

/* Courses */
const courses = crudController({
  model: 'course',
  entityName: 'Course',
  searchFields: ['name', 'code'],
  orderBy: { name: 'asc' },
  include: { department: true, _count: { select: { classes: true, subjects: true } } },
  validateCreate: (b) => {
    if (!b.name || !b.code || !b.departmentId) {
      throw new ApiError(400, 'name, code and departmentId are required');
    }
  },
});
router.get('/courses', courses.list);
router.get('/courses/:id', courses.getOne);
router.post('/courses', authorize('ADMIN'), courses.create);
router.put('/courses/:id', authorize('ADMIN'), courses.update);
router.delete('/courses/:id', authorize('ADMIN'), courses.remove);

/* Classes */
const classes = crudController({
  model: 'classRoom',
  entityName: 'Class',
  searchFields: ['name', 'section', 'academicYear'],
  orderBy: { name: 'asc' },
  include: { course: { include: { department: true } }, _count: { select: { students: true } } },
  validateCreate: (b) => {
    if (!b.name || !b.section || !b.courseId) {
      throw new ApiError(400, 'name, section and courseId are required');
    }
  },
});
router.get('/classes', classes.list);
router.get('/classes/:id', classes.getOne);
router.get('/classes/:id/students', async (req, res, next) => {
  try {
    const items = await prisma.student.findMany({
      where: { classId: req.params.id },
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { rollNumber: 'asc' },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});
router.post('/classes', authorize('ADMIN'), classes.create);
router.put('/classes/:id', authorize('ADMIN'), classes.update);
router.delete('/classes/:id', authorize('ADMIN'), classes.remove);

/* Subjects */
const subjects = crudController({
  model: 'subject',
  entityName: 'Subject',
  searchFields: ['name', 'code'],
  orderBy: { name: 'asc' },
  include: { course: true, faculty: { include: { user: { select: { name: true } } } } },
  validateCreate: (b) => {
    if (!b.name || !b.code || !b.courseId) {
      throw new ApiError(400, 'name, code and courseId are required');
    }
  },
});
router.get('/subjects', subjects.list);
router.get('/subjects/:id', subjects.getOne);
router.post('/subjects', authorize('ADMIN'), subjects.create);
router.put('/subjects/:id', authorize('ADMIN'), subjects.update);
router.delete('/subjects/:id', authorize('ADMIN'), subjects.remove);

/* Timetable */
const timetable = crudController({
  model: 'timetable',
  entityName: 'Timetable slot',
  orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  include: {
    class: true,
    subject: true,
    faculty: { include: { user: { select: { name: true } } } },
  },
  validateCreate: (b) => {
    if (!b.classId || !b.subjectId || !b.facultyId || b.dayOfWeek === undefined || !b.period) {
      throw new ApiError(400, 'classId, subjectId, facultyId, dayOfWeek and period are required');
    }
  },
});
router.get('/timetable', timetable.list);
router.get('/timetable/:id', timetable.getOne);
router.post('/timetable', authorize('ADMIN'), timetable.create);
router.put('/timetable/:id', authorize('ADMIN'), timetable.update);
router.delete('/timetable/:id', authorize('ADMIN'), timetable.remove);

export default router;
