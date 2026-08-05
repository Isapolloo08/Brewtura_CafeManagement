import express from 'express';
import {
  gmailStatus,
  gmailAuthUrl,
  gmailCallback,
  gmailPoll,
  gmailMessages,
  gmailSend,
  gmailDisconnect,
} from '../controllers/gmailController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// OAuth callback - public (no auth token, called by Google redirect)
router.get('/callback', gmailCallback);

router.use(authenticateToken);

router.get('/status', gmailStatus);
router.get('/auth-url', authorizeRoles('admin', 'manager'), gmailAuthUrl);
router.get('/messages', authorizeRoles('admin', 'manager'), gmailMessages);
router.post('/send', authorizeRoles('admin', 'manager'), gmailSend);
router.post('/poll', authorizeRoles('admin', 'manager'), gmailPoll);
router.post('/disconnect', authorizeRoles('admin', 'manager'), gmailDisconnect);

export default router;
