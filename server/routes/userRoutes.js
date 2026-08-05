import express from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('admin', 'manager'), getUsers);
router.get('/:id', authorizeRoles('admin', 'manager'), getUserById);
router.post('/', authorizeRoles('admin', 'manager'), createUser);
router.put('/:id', authorizeRoles('admin', 'manager'), updateUser);
router.delete('/:id', authorizeRoles('admin', 'manager'), deleteUser);

export default router;
