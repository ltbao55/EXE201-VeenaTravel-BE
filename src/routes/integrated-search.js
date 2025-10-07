import express from 'express';
import integratedSearchService from '../services/integrated-search-service.js';

const router = express.Router();

/**
 * @route POST /api/integrated-search/places
 * @desc Tìm kiếm địa điểm tích hợp Pinecone + Google Maps
 * @access Public
 */
router.post('/places', async (req, res) => {
  try {
    const { query, limit = 5, category } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query tìm kiếm là bắt buộc'
      });
    }
    
    console.log(`🔍 API Request: Tìm kiếm "${query}"`);
    
    const result = await integratedSearchService.searchPlacesWithGoogleMaps(query, {
      limit: Math.min(limit, 10), // Giới hạn tối đa 10 kết quả
      filter: category ? { category: { $eq: category } } : null
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: `Tìm thấy ${result.data.results.length} địa điểm`
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('❌ Lỗi API integrated search:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm'
    });
  }
});

/**
 * @route POST /api/integrated-search/category
 * @desc Tìm kiếm theo category với enrichment
 * @access Public
 */
router.post('/category', async (req, res) => {
  try {
    const { query, category } = req.body;
    
    if (!query || !category) {
      return res.status(400).json({
        success: false,
        message: 'Query và category là bắt buộc'
      });
    }
    
    console.log(`🔍 API Request: Tìm kiếm "${query}" trong category "${category}"`);
    
    const result = await integratedSearchService.searchByCategory(query, category);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: `Tìm thấy ${result.data.results.length} địa điểm trong category ${category}`
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('❌ Lỗi API category search:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm theo category'
    });
  }
});

/**
 * @route POST /api/integrated-search/near
 * @desc Tìm kiếm gần location với enrichment
 * @access Public
 */
router.post('/near', async (req, res) => {
  try {
    const { query, location, radius = 10 } = req.body;
    
    if (!query || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Query và location (lat, lng) là bắt buộc'
      });
    }
    
    console.log(`🔍 API Request: Tìm kiếm "${query}" gần ${location.lat}, ${location.lng}`);
    
    const result = await integratedSearchService.searchNearLocation(query, location, radius);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: `Tìm thấy ${result.data.results.length} địa điểm trong bán kính ${radius}km`
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('❌ Lỗi API near location search:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm gần location'
    });
  }
});

/**
 * @route GET /api/integrated-search/demo
 * @desc Demo endpoint với các query mẫu
 * @access Public
 */
router.get('/demo', async (req, res) => {
  try {
    const demoQueries = [
      'khách sạn gần biển',
      'nhà hàng hải sản',
      'điểm tham quan lịch sử'
    ];
    
    const results = [];
    
    for (const query of demoQueries) {
      try {
        const result = await integratedSearchService.searchPlacesWithGoogleMaps(query, { limit: 2 });
        results.push({
          query,
          success: result.success,
          count: result.success ? result.data.results.length : 0,
          enrichment_rate: result.success ? result.data.search_metadata.enrichment_rate : 0,
          sample_result: result.success && result.data.results.length > 0 ? {
            name: result.data.results[0].pinecone_data.name,
            score: result.data.results[0].score,
            has_google_data: result.data.results[0].enrichment_status === 'success'
          } : null
        });
        
        // Delay để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        demo_results: results,
        total_queries: demoQueries.length,
        successful_queries: results.filter(r => r.success).length,
        timestamp: new Date().toISOString()
      },
      message: 'Demo tích hợp Pinecone + Google Maps API'
    });
    
  } catch (error) {
    console.error('❌ Lỗi API demo:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi chạy demo'
    });
  }
});

/**
 * @route GET /api/integrated-search/health
 * @desc Health check cho integrated search service
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    // Test kết nối Pinecone
    const pineconeTest = await integratedSearchService.searchPlacesWithGoogleMaps('test', { limit: 1 });
    
    res.json({
      success: true,
      data: {
        pinecone_status: pineconeTest.success ? 'connected' : 'error',
        google_maps_status: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'missing',
        service_status: 'healthy',
        timestamp: new Date().toISOString()
      },
      message: 'Integrated search service health check'
    });
    
  } catch (error) {
    console.error('❌ Lỗi health check:', error);
    res.status(500).json({
      success: false,
      message: 'Service không khỏe mạnh',
      error: error.message
    });
  }
});

export default router;
