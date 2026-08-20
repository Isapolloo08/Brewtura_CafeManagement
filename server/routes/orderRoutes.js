import express from 'express';
import { createOrder, getOrders, updateOrderStatus, getOrderByToken, getTransactions } from '../controllers/orderController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public QR status lookup
router.get('/token/:token', getOrderByToken);
// Public or self-ordering QR creation
router.post('/public', createOrder);

// Authenticated staff endpoints
router.use(authenticateToken);
router.get('/', getOrders);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);
router.get('/transactions', authorizeRoles('admin', 'manager'), getTransactions);

export default router;
