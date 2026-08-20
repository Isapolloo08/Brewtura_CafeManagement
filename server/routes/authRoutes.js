import express from 'express';
import { login, pinLogin, getMe, updateMe, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/pin-login', pinLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);

export default router;
