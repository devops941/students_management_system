import { Router } from 'express';
import * as reports from '../controllers/report.controller.js';
import { adminDashboard, facultyDashboard, settingsController } from '../controllers/dashboard.controller.js';
import * as users from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/* Dashboards */
router.get('/dashboard/admin', authorize('ADMIN'), adminDashboard);
router.get('/dashboard/faculty', authorize('FACULTY', 'ADMIN'), facultyDashboard);

/* Reports */
router.get('/reports/daily', authorize('ADMIN', 'FACULTY'), reports.dailyReport);
router.get('/reports/subject-wise', authorize('ADMIN', 'FACULTY'), reports.subjectWiseReport);
router.get('/reports/monthly', authorize('ADMIN', 'FACULTY'), reports.monthlyReport);
router.get('/reports/class', authorize('ADMIN', 'FACULTY'), reports.classReport);
router.get('/reports/export', authorize('ADMIN', 'FACULTY'), reports.exportReport);

/* Settings */
router.get('/settings', settingsController.get);
router.put('/settings', authorize('ADMIN'), settingsController.update);

/* User administration */
router.get('/users', authorize('ADMIN'), users.listUsers);
router.get('/users/:id', authorize('ADMIN'), users.getUser);
router.post('/users', authorize('ADMIN'), users.createUser);
router.put('/users/:id', authorize('ADMIN'), users.updateUser);
router.patch('/users/:id/toggle', authorize('ADMIN'), users.toggleUser);
router.delete('/users/:id', authorize('ADMIN'), users.deleteUser);

/* Audit trail */
router.get('/audit-logs', authorize('ADMIN'), users.listAuditLogs);

export default router;
