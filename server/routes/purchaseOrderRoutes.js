import express from 'express';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getPurchaseOrders);
router.post('/', authorizeRoles('admin', 'manager', 'stock_clerk'), createPurchaseOrder);
router.patch('/:poCode/status', authorizeRoles('admin', 'manager'), updatePurchaseOrderStatus);
router.patch('/:poCode', authorizeRoles('admin', 'manager', 'stock_clerk'), updatePurchaseOrder);
router.delete('/:poCode', authorizeRoles('admin', 'manager'), deletePurchaseOrder);

export default router;
