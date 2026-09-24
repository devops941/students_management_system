import { Router } from 'express';
import * as attendance from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/attendance/session', authorize('FACULTY', 'ADMIN'), attendance.sessionRoster);
router.post('/attendance/mark', authorize('FACULTY', 'ADMIN'), attendance.markAttendance);
router.get('/attendance/defaulters', authorize('ADMIN', 'FACULTY'), attendance.defaulters);
router.post('/attendance/notify-defaulters', authorize('ADMIN'), attendance.notifyDefaulters);
router.get('/attendance/student/:studentId/summary', authorize('ADMIN', 'FACULTY'), attendance.studentSummary);
router.get('/attendance', authorize('ADMIN', 'FACULTY'), attendance.listAttendance);
router.put('/attendance/:id', authorize('FACULTY', 'ADMIN'), attendance.updateAttendance);
router.delete('/attendance/:id', authorize('ADMIN'), attendance.deleteAttendance);

export default router;
