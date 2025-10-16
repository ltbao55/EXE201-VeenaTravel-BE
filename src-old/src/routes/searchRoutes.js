import express from 'express';
import searchController from '../controllers/searchController.js';

const router = express.Router();

/**
 * @route POST /api/search/semantic
 * @desc Tìm kiếm ngữ nghĩa địa điểm du lịch
 * @access Public (do đã bypass auth)
 */
router.post('/semantic', searchController.semanticSearch);

/**
 * @route POST /api/search/category
 * @desc Tìm kiếm địa điểm theo danh mục
 * @access Public (do đã bypass auth)
 */
router.post('/category', searchController.searchByCategory);

/**
 * @route POST /api/search/nearby
 * @desc Tìm kiếm địa điểm gần vị trí hiện tại
 * @access Public (do đã bypass auth)
 */
router.post('/nearby', searchController.searchNearby);

/**
 * @route POST /api/search/smart
 * @desc Tìm kiếm thông minh kết hợp nhiều nguồn
 * @access Public (do đã bypass auth)
 */
router.post('/smart', searchController.smartSearch);

/**
 * @route GET /api/search/suggestions
 * @desc Lấy gợi ý tìm kiếm
 * @access Public (do đã bypass auth)
 */
router.get('/suggestions', searchController.getSearchSuggestions);

export default router;
