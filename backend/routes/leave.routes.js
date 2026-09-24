import { Router } from 'express';
import * as leave from '../controllers/leave.controller.js';
import * as alert from '../controllers/alert.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/* Leave & on-duty */
router.get('/leaves', leave.listLeaves);
router.get('/leaves/pending-count', leave.pendingCount);
router.post('/leaves', leave.applyLeave);
router.patch('/leaves/:id/decide', authorize('FACULTY', 'ADMIN'), leave.decideLeave);
router.delete('/leaves/:id', leave.cancelLeave);

/* Alerts */
router.get('/alerts', authorize('ADMIN'), alert.listAlerts);
router.post('/alerts/regenerate', authorize('ADMIN'), alert.regenerateAlerts);
router.post('/alerts/notify', authorize('ADMIN'), alert.notifyAlerts);
router.get('/alerts/mine', alert.myAlerts);
router.patch('/alerts/read-all', alert.markAllRead);
router.patch('/alerts/:id/read', alert.markAlertRead);
router.patch('/alerts/:id/resolve', authorize('ADMIN'), alert.resolveAlert);

export default router;
