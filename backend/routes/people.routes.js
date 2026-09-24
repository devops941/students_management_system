import { Router } from 'express';
import * as students from '../controllers/student.controller.js';
import * as faculty from '../controllers/faculty.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/* Student self-service (student / parent accounts) */
router.get('/students/me/attendance', students.myAttendance);
router.get('/students/me/leaves', students.myLeaves);
router.get('/parent/wards', authorize('PARENT', 'ADMIN'), students.myWards);

/* Faculty self-service */
router.get('/faculty/me/assignments', authorize('FACULTY', 'ADMIN'), faculty.myAssignments);

/* Admin-managed student directory */
router.get('/students', authorize('ADMIN', 'FACULTY'), students.listStudents);
router.get('/students/:id', authorize('ADMIN', 'FACULTY'), students.getStudent);
router.post('/students', authorize('ADMIN'), students.createStudent);
router.post('/students/bulk-import', authorize('ADMIN'), students.bulkImportStudents);
router.put('/students/:id', authorize('ADMIN'), students.updateStudent);
router.delete('/students/:id', authorize('ADMIN'), students.deleteStudent);

/* Faculty directory */
router.get('/faculty-list', authorize('ADMIN'), faculty.listFaculty);
router.get('/faculty-list/:id', authorize('ADMIN'), faculty.getFaculty);
router.post('/faculty-list', authorize('ADMIN'), faculty.createFaculty);
router.put('/faculty-list/:id', authorize('ADMIN'), faculty.updateFaculty);
router.delete('/faculty-list/:id', authorize('ADMIN'), faculty.deleteFaculty);

export default router;
