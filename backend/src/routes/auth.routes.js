import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', auth.login);
router.post('/register', auth.register);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.get('/me', authenticate, auth.me);
router.post('/change-password', authenticate, auth.changePassword);

export default router;
