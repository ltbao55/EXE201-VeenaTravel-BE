import express from 'express';
import {
  testOpenRouter,
  extractTravelIntent,
  generateTravelItinerary,
  compareAIPerformance,
  hybridSearch
} from '../controllers/aiController.js';


console.log('Attempting to load AI routes...');

const router = express.Router();

/**
 * Routes cho AI services sử dụng OpenRouter + DeepSeek v3.1
 */

// Simple GET route for testing
router.get('/ping', (req, res) => {
  res.status(200).json({ success: true, message: 'AI route is alive!' });
});


// Test OpenRouter connection với DeepSeek v3.1
router.post('/test', testOpenRouter);

// Trích xuất ý định du lịch từ query người dùng
router.post('/extract-intent', extractTravelIntent);

// Tạo lịch trình du lịch hoàn chỉnh
router.post('/generate-itinerary', generateTravelItinerary);

// So sánh performance AI
router.post('/compare-performance', compareAIPerformance);

// Hybrid search: Google AI embedding + DeepSeek v3.1 analysis
router.post('/hybrid-search', hybridSearch);

export default router;
