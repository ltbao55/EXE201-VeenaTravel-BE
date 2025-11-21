import express from 'express';
import mapsController from '../controllers/mapsController.js';

const router = express.Router();

/**
 * @route GET /api/maps/api-key
 * @desc Lấy Google Maps API key (dùng cho frontend)
 * @access Public (đã giới hạn domain trong Google Cloud Console)
 */
router.get('/api-key', mapsController.getMapsApiKey);

/**
 * @route POST /api/maps/geocode
 * @desc Lấy tọa độ từ địa chỉ
 * @access Public (do đã bypass auth)
 */
router.post('/geocode', mapsController.geocode);

/**
 * @route POST /api/maps/reverse-geocode
 * @desc Lấy địa chỉ từ tọa độ
 * @access Public (do đã bypass auth)
 */
router.post('/reverse-geocode', mapsController.reverseGeocode);

/**
 * @route POST /api/maps/nearby
 * @desc Tìm kiếm địa điểm gần đây
 * @access Public (do đã bypass auth)
 */
router.post('/nearby', mapsController.searchNearby);

/**
 * @route GET /api/maps/place/:placeId
 * @desc Lấy chi tiết địa điểm
 * @access Public (do đã bypass auth)
 */
router.get('/place/:placeId', mapsController.getPlaceDetails);

/**
 * @route POST /api/maps/distance-matrix
 * @desc Tính khoảng cách và thời gian di chuyển
 * @access Public (do đã bypass auth)
 */
router.post('/distance-matrix', mapsController.getDistanceMatrix);

/**
 * @route POST /api/maps/directions
 * @desc Tìm đường đi giữa các điểm
 * @access Public (do đã bypass auth)
 */
router.post('/directions', mapsController.getDirections);

/**
 * @route POST /api/maps/optimize-route
 * @desc Tối ưu hóa lộ trình cho nhiều điểm
 * @access Public (do đã bypass auth)
 */
router.post('/optimize-route', mapsController.optimizeRoute);

/**
 * @route GET /api/maps/photo-url
 * @desc Generate photo URL from photo_reference
 * @access Public (do đã bypass auth)
 */
router.get('/photo-url', mapsController.generatePhotoUrl);

export default router;
