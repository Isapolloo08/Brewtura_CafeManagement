import express from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch, hardDeleteBranch } from '../controllers/branchController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getBranches);
router.post('/', authorizeRoles('admin'), createBranch);
router.put('/:id', authorizeRoles('admin', 'manager'), updateBranch);
router.delete('/:id', authorizeRoles('admin'), deleteBranch);
router.delete('/:id/hard', authorizeRoles('admin'), hardDeleteBranch);

export default router;
