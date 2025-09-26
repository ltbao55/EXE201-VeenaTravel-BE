import express from 'express';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus
} from '../controllers/plansController.js';

const router = express.Router();

// Public routes
router.get('/', getAllPlans);
router.get('/:id', getPlanById);

// Routes (previously admin only, now public)
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);
router.patch('/:id/toggle-status', togglePlanStatus);

export default router;
