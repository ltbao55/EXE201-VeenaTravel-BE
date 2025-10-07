import express from 'express';
import itineraryController from '../controllers/itineraryController.js';

const router = express.Router();

/**
 * @route POST /api/itinerary/generate
 * @desc Tạo lịch trình du lịch mới bằng AI
 * @access Public (do đã bypass auth)
 */
router.post('/generate', itineraryController.generateItinerary);

/**
 * @route POST /api/itinerary/optimize
 * @desc Tối ưu hóa lịch trình dựa trên phản hồi
 * @access Public (do đã bypass auth)
 */
router.post('/optimize', itineraryController.optimizeItinerary);

/**
 * @route POST /api/itinerary/suggest-places
 * @desc Gợi ý địa điểm dựa trên sở thích
 * @access Public (do đã bypass auth)
 */
router.post('/suggest-places', itineraryController.suggestPlaces);

/**
 * @route GET /api/itinerary/saved
 * @desc Lấy danh sách lịch trình đã lưu
 * @access Public (do đã bypass auth)
 */
router.get('/saved', itineraryController.getSavedItineraries);

/**
 * @route GET /api/itinerary/:tripId
 * @desc Lấy chi tiết lịch trình
 * @access Public (do đã bypass auth)
 */
router.get('/:tripId', itineraryController.getItineraryDetails);

/**
 * @route DELETE /api/itinerary/:tripId
 * @desc Xóa lịch trình
 * @access Public (do đã bypass auth)
 */
router.delete('/:tripId', itineraryController.deleteItinerary);

export default router;
