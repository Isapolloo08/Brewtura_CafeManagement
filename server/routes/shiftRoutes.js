import express from 'express';
import { openShift, closeShift, recordCashMovement, getCurrentShift, getShifts, getBranches } from '../controllers/shiftController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getShifts);
router.get('/branches', getBranches);
router.get('/current', getCurrentShift);
router.post('/open', openShift);
router.post('/close', closeShift);
router.post('/cash-movement', recordCashMovement);

export default router;
