import express from 'express';
import chatController from '../controllers/chatController.js';
import { verifyToken } from '../middleware/auth.js';
import { checkMessageLimit } from '../middleware/subscription.js';
import SubscriptionService from '../services/subscription-service.js';

const router = express.Router();

// Middleware wrapper để increment message count sau khi chat thành công
const trackMessageUsage = async (req, res, next) => {
  // Lưu trữ original json method
  const originalJson = res.json.bind(res);
  
  // Override json method để track usage
  res.json = function(data) {
    // Nếu chat thành công và có user, increment message count
    if (data && data.success && req.user && req.user._id) {
      // Increment asynchronously không chặn response
      SubscriptionService.incrementMessageCount(req.user._id).catch(error => {
        console.error('❌ Error incrementing message count:', error);
      });
      console.log(`📊 Message usage tracked for user ${req.user._id}`);
    }
    
    // Trả về response như bình thường
    return originalJson(data);
  };
  
  next();
};

/**
 * @route POST /api/chat/message
 * @desc Send message to AI chat assistant
 * @access Protected (with message limit check)
 */
router.post('/message', verifyToken, checkMessageLimit, trackMessageUsage, chatController.chatWithAI);

/**
 * @route POST /api/chat/modify-itinerary
 * @desc Modify itinerary based on chat request
 * @access Protected (with message limit check)
 */
router.post('/modify-itinerary', verifyToken, checkMessageLimit, trackMessageUsage, chatController.modifyItinerary);

/**
 * @route POST /api/chat/recommendations
 * @desc Get travel recommendations based on location and interests
 * @access Protected (with message limit check)
 */
router.post('/recommendations', verifyToken, checkMessageLimit, trackMessageUsage, chatController.getRecommendations);

export default router;
