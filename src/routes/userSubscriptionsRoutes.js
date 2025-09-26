import express from 'express';
import {
  getCurrentSubscription,
  getSubscriptionHistory,
  checkTripLimit,
  checkMessageLimit,
  getAllSubscriptions,
  updateSubscription
} from '../controllers/userSubscriptionsController.js';

const router = express.Router();

// User routes (now public)
router.get('/current', getCurrentSubscription);
router.get('/history', getSubscriptionHistory);
router.get('/check-trip-limit', checkTripLimit);
router.get('/check-message-limit', checkMessageLimit);

// Routes (previously admin only, now public)
router.get('/admin/all', getAllSubscriptions);
router.put('/admin/:id', updateSubscription);

export default router;
