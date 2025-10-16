import express from 'express';
import {
  getCurrentSubscription,
  getSubscriptionHistory,
  checkTripLimit,
  checkMessageLimit,
  getAllSubscriptions,
  updateSubscription
} from '../controllers/userSubscriptionsController.js';
import { verifyFirebaseToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// User routes (authenticated)
router.get('/current', verifyFirebaseToken, getCurrentSubscription);
router.get('/history', verifyFirebaseToken, getSubscriptionHistory);
router.get('/check-trip-limit', verifyFirebaseToken, checkTripLimit);
router.get('/check-message-limit', verifyFirebaseToken, checkMessageLimit);

// Admin routes
router.get('/admin/all', verifyFirebaseToken, requireAdmin, getAllSubscriptions);
router.put('/admin/:id', verifyFirebaseToken, requireAdmin, updateSubscription);

export default router;
