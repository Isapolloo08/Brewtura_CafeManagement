import express from 'express';
import { openShift, closeShift, recordCashMovement, getCurrentShift, getShifts, getBranches, updateShift, getShiftReport } from '../controllers/shiftController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('admin', 'manager', 'cashier'), getShifts);
router.get('/branches', getBranches);
router.get('/current', authorizeRoles('admin', 'manager', 'cashier'), getCurrentShift);
router.post('/open', authorizeRoles('admin', 'manager', 'cashier'), openShift);
router.post('/close', authorizeRoles('admin', 'manager', 'cashier'), closeShift);
router.post('/cash-movement', authorizeRoles('admin', 'manager', 'cashier'), recordCashMovement);
router.get('/:id/report', authorizeRoles('admin', 'manager'), getShiftReport);
router.put('/:id', authorizeRoles('admin', 'manager'), updateShift);

export default router;
