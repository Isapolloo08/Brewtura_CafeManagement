import express from 'express';
import {
  smsStatusHandler,
  smsStatsHandler,
  smsPoll,
  smsMessages,
  smsSend,
  smsWebhook,
} from '../controllers/smsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Inbound SMS webhook - public (Semaphore posts here, like the Gmail OAuth callback).
// Semaphore sends application/x-www-form-urlencoded, so parse it before the handler.
router.post('/webhook', express.urlencoded({ extended: true }), smsWebhook);

router.use(authenticateToken);

router.get('/status', smsStatusHandler);
router.get('/stats', authorizeRoles('admin', 'manager'), smsStatsHandler);
router.get('/messages', authorizeRoles('admin', 'manager'), smsMessages);
router.post('/send', authorizeRoles('admin', 'manager'), smsSend);
router.post('/poll', authorizeRoles('admin', 'manager'), smsPoll);

export default router;