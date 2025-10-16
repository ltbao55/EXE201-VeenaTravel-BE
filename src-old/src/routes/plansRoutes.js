import express from 'express';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus
} from '../controllers/plansController.js';
import { verifyFirebaseToken, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/', optionalAuth, getAllPlans);
router.get('/:id', optionalAuth, getPlanById);

// Admin only routes
router.post('/', verifyFirebaseToken, requireAdmin, createPlan);
router.put('/:id', verifyFirebaseToken, requireAdmin, updatePlan);
router.delete('/:id', verifyFirebaseToken, requireAdmin, deletePlan);
router.patch('/:id/toggle-status', verifyFirebaseToken, requireAdmin, togglePlanStatus);

export default router;
