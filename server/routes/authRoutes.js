import express from 'express';
import { login, pinLogin, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/pin-login', pinLogin);
router.get('/me', authenticateToken, getMe);

export default router;
