import express from 'express';
import chatController from '../controllers/chatController.js';

const router = express.Router();

/**
 * @route POST /api/chat/message
 * @desc Send message to AI chat assistant
 * @access Public
 */
router.post('/message', chatController.chatWithAI);

/**
 * @route POST /api/chat/modify-itinerary
 * @desc Modify itinerary based on chat request
 * @access Public
 */
router.post('/modify-itinerary', chatController.modifyItinerary);

/**
 * @route POST /api/chat/recommendations
 * @desc Get travel recommendations based on location and interests
 * @access Public
 */
router.post('/recommendations', chatController.getRecommendations);

export default router;
