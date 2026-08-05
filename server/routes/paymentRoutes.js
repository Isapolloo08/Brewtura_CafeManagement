import express from 'express';
import { recordPayment, getDiscounts, createDiscount } from '../controllers/paymentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Payments
router.post('/payments', recordPayment);

// Discounts
router.get('/discounts', getDiscounts);
router.post('/discounts', authorizeRoles('admin', 'manager'), createDiscount);

export default router;
