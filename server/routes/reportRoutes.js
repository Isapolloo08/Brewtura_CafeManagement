import express from 'express';
import { getDashboardStats, getSalesReport, getSettings, updateSettings } from '../controllers/reportController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Dashboard stats
router.get('/dashboard-stats', authorizeRoles('admin', 'manager', 'cashier'), getDashboardStats);

// Reports
router.get('/sales', authorizeRoles('admin', 'manager'), getSalesReport);

// Settings
router.get('/settings', getSettings);
router.put('/settings', authorizeRoles('admin'), updateSettings);

export default router;
