import express from 'express';
import {
  getCurrentSubscription,
  getSubscriptionHistory,
  checkTripLimit,
  checkMessageLimit,
  getAllSubscriptions,
  updateSubscription
} from '../controllers/userSubscriptionsController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { 
  requireSubscription, 
  requirePremium, 
  requirePro, 
  checkTripLimit as checkTripLimitMiddleware,
  checkMessageLimit as checkMessageLimitMiddleware,
  getUserSubscriptionInfo
} from '../middleware/subscription.js';

const router = express.Router();

// User routes (authenticated)
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/history', verifyToken, getSubscriptionHistory);
router.get('/check-trip-limit', verifyToken, checkTripLimit);
router.get('/check-message-limit', verifyToken, checkMessageLimit);

// Middleware routes để test phân quyền
router.get('/test-premium', verifyToken, requirePremium(), (req, res) => {
  res.json({
    success: true,
    message: 'Premium access granted',
    userPlan: req.userPlan,
    subscription: req.subscription
  });
});

router.get('/test-pro', verifyToken, requirePro(), (req, res) => {
  res.json({
    success: true,
    message: 'Pro access granted',
    userPlan: req.userPlan,
    subscription: req.subscription
  });
});

// Admin routes
router.get('/admin/all', verifyToken, requireAdmin, getAllSubscriptions);
router.put('/admin/:id', verifyToken, requireAdmin, updateSubscription);

export default router;
