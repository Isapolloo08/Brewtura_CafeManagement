import express from 'express';
import { recordPayment, getDiscounts, createDiscount } from '../controllers/paymentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Payments
router.post('/payments', authorizeRoles('admin', 'manager', 'cashier'), recordPayment);

// Discounts
router.get('/discounts', authorizeRoles('admin', 'manager', 'cashier'), getDiscounts);
router.post('/discounts', authorizeRoles('admin', 'manager'), createDiscount);

export default router;
