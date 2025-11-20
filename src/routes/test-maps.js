import express from 'express';
import googleMapsService from '../services/googlemaps-service.js';

const router = express.Router();

/**
 * Test endpoint cho Google Maps API
 * GET /api/test-maps/status
 */
router.get('/status', async (req, res) => {
  try {
    // Test với địa chỉ mặc định
    const testResult = await googleMapsService.getCoordinates('Chợ Bến Thành, Hồ Chí Minh');
    
    if (testResult.success) {
      res.json({
        success: true,
        message: 'Google Maps API hoạt động bình thường',
        data: {
          api_status: 'active',
          test_location: testResult.data,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Google Maps API có vấn đề',
        error: testResult.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi test Google Maps API',
      error: error.message
    });
  }
});

/**
 * Test geocoding
 * POST /api/test-maps/geocode
 * Body: { "address": "địa chỉ cần test" }
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ là bắt buộc'
      });
    }
    
    const result = await googleMapsService.getCoordinates(address);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi geocoding',
      error: error.message
    });
  }
});

/**
 * Test nearby search
 * POST /api/test-maps/nearby
 * Body: { "lat": 10.762622, "lng": 106.660172, "type": "restaurant", "radius": 1000 }
 */
router.post('/nearby', async (req, res) => {
  try {
    const { lat, lng, type = 'tourist_attraction', radius = 1000 } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Tọa độ lat và lng là bắt buộc'
      });
    }
    
    const result = await googleMapsService.searchNearbyPlaces(
      { lat, lng },
      type,
      radius
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm nearby',
      error: error.message
    });
  }
});

export default router;
