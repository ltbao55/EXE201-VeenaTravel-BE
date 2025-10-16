import hybridSearchService from '../services/hybrid-search-service.js';
import cacheService from '../services/cache-service.js';
import loggingService from '../services/logging-service.js';

/**
 * =================================================================
 * Hybrid Search Controller
 * =================================================================
 * Handles HTTP requests for hybrid search operations.
 * =================================================================
 */

/**
 * Main hybrid search endpoint
 * POST /api/hybrid-search/search
 */
const hybridSearch = async (req, res) => {
  try {
    const { query, partnerLimit, googleLimit } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query là bắt buộc và không được để trống'
      });
    }

    const options = {
      partnerLimit: parseInt(partnerLimit) || 2,
      googleLimit: parseInt(googleLimit) || 5
    };

    const result = await hybridSearchService.hybridSearch(query.trim(), options);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Tìm kiếm hybrid thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller hybridSearch:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi thực hiện tìm kiếm hybrid'
    });
  }
};

/**
 * Search with location context
 * POST /api/hybrid-search/search-near
 */
const searchNearLocation = async (req, res) => {
  try {
    const { query, location, partnerLimit, googleLimit } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query là bắt buộc và không được để trống'
      });
    }

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Location với lat và lng là bắt buộc'
      });
    }

    const options = {
      partnerLimit: parseInt(partnerLimit) || 2,
      googleLimit: parseInt(googleLimit) || 5,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      }
    };

    const result = await hybridSearchService.hybridSearch(query.trim(), options);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Tìm kiếm hybrid theo vị trí thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller searchNearLocation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi thực hiện tìm kiếm hybrid theo vị trí'
    });
  }
};

/**
 * Get search statistics
 * GET /api/hybrid-search/stats
 */
const getSearchStats = async (req, res) => {
  try {
    const metrics = loggingService.getMetrics();
    
    res.status(200).json({
      success: true,
      message: 'Lấy thống kê tìm kiếm thành công',
      data: metrics
    });

  } catch (error) {
    console.error('❌ Lỗi controller getSearchStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê tìm kiếm'
    });
  }
};

/**
 * Get system health status
 * GET /api/hybrid-search/health
 */
const getHealthStatus = async (req, res) => {
  try {
    const healthStatus = loggingService.getHealthStatus();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthStatus.status === 'healthy',
      message: `Hệ thống đang ${healthStatus.status === 'healthy' ? 'hoạt động bình thường' : 'gặp sự cố'}`,
      data: healthStatus
    });

  } catch (error) {
    console.error('❌ Lỗi controller getHealthStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra trạng thái hệ thống'
    });
  }
};

/**
 * Clear cache
 * DELETE /api/hybrid-search/cache
 */
const clearCache = async (req, res) => {
  try {
    cacheService.clear();
    
    res.status(200).json({
      success: true,
      message: 'Cache đã được xóa thành công'
    });

  } catch (error) {
    console.error('❌ Lỗi controller clearCache:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa cache'
    });
  }
};

/**
 * Get cache statistics
 * GET /api/hybrid-search/cache/stats
 */
const getCacheStats = async (req, res) => {
  try {
    const cacheStats = cacheService.getStats();
    
    res.status(200).json({
      success: true,
      message: 'Lấy thống kê cache thành công',
      data: cacheStats
    });

  } catch (error) {
    console.error('❌ Lỗi controller getCacheStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê cache'
    });
  }
};

/**
 * Get recent logs
 * GET /api/hybrid-search/logs
 */
const getRecentLogs = async (req, res) => {
  try {
    const { limit, level, type } = req.query;
    
    const logs = loggingService.getRecentLogs(
      parseInt(limit) || 50,
      level || null,
      type || null
    );
    
    res.status(200).json({
      success: true,
      message: 'Lấy logs thành công',
      data: {
        logs,
        total: logs.length,
        filters: { limit: parseInt(limit) || 50, level, type }
      }
    });

  } catch (error) {
    console.error('❌ Lỗi controller getRecentLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy logs'
    });
  }
};

export default {
  hybridSearch,
  searchNearLocation,
  getSearchStats,
  getHealthStatus,
  clearCache,
  getCacheStats,
  getRecentLogs
};
