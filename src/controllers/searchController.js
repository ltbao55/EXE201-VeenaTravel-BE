import pineconeService from '../services/pinecone-service.js';
import googleMapsService from '../services/googlemaps-service.js';

/**
 * Tìm kiếm ngữ nghĩa địa điểm du lịch
 */
export const semanticSearch = async (req, res) => {
  try {
    const { query, limit = 10, category } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Câu truy vấn tìm kiếm là bắt buộc'
      });
    }
    
    const options = {
      limit: parseInt(limit),
      filter: category ? { category: { $eq: category } } : null
    };
    
    const result = await pineconeService.semanticSearch(query, options);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Tìm kiếm thành công',
      data: result.data
    });
    
  } catch (error) {
    console.error('Lỗi tìm kiếm ngữ nghĩa:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình tìm kiếm'
    });
  }
};

/**
 * Tìm kiếm địa điểm theo danh mục
 */
export const searchByCategory = async (req, res) => {
  try {
    const { query, category } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Câu truy vấn tìm kiếm là bắt buộc'
      });
    }
    
    const result = await pineconeService.searchPlacesByCategory(query, category);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Tìm kiếm theo danh mục thành công',
      data: result.data
    });
    
  } catch (error) {
    console.error('Lỗi tìm kiếm theo danh mục:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tìm kiếm theo danh mục'
    });
  }
};

/**
 * Tìm kiếm địa điểm gần vị trí hiện tại
 */
export const searchNearby = async (req, res) => {
  try {
    const { query, location, radius = 10 } = req.body;
    
    if (!query || !location) {
      return res.status(400).json({
        success: false,
        message: 'Câu truy vấn và vị trí là bắt buộc'
      });
    }
    
    if (!location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Tọa độ vĩ độ và kinh độ là bắt buộc'
      });
    }
    
    // Tìm kiếm trong Pinecone trước
    const pineconeResult = await pineconeService.semanticSearch(query, { limit: 20 });
    
    if (!pineconeResult.success) {
      return res.status(500).json({
        success: false,
        message: pineconeResult.message
      });
    }
    
    // Lọc kết quả theo khoảng cách
    const nearbyPlaces = pineconeResult.data.results.filter(place => {
      if (!place.metadata.coordinates) return false;
      
      const distance = calculateDistance(
        location.lat, location.lng,
        place.metadata.coordinates.lat, place.metadata.coordinates.lng
      );
      
      return distance <= radius;
    });
    
    // Bổ sung tìm kiếm từ Google Maps
    const googleResult = await googleMapsService.searchNearbyPlaces(
      location,
      'tourist_attraction',
      radius * 1000 // Convert km to meters
    );
    
    return res.status(200).json({
      success: true,
      message: 'Tìm kiếm địa điểm gần đây thành công',
      data: {
        query,
        location,
        radius,
        pineconeResults: nearbyPlaces,
        googleResults: googleResult.success ? googleResult.data : [],
        totalFound: nearbyPlaces.length + (googleResult.success ? googleResult.data.length : 0)
      }
    });
    
  } catch (error) {
    console.error('Lỗi tìm kiếm địa điểm gần đây:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tìm kiếm địa điểm gần đây'
    });
  }
};

/**
 * Tìm kiếm thông minh kết hợp nhiều nguồn
 */
export const smartSearch = async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Câu truy vấn tìm kiếm là bắt buộc'
      });
    }
    
    const results = {
      semantic: null,
      google: null,
      combined: []
    };
    
    // Tìm kiếm ngữ nghĩa trong Pinecone
    try {
      const semanticResult = await pineconeService.semanticSearch(query, {
        limit: 15,
        filter: filters.category ? { category: { $eq: filters.category } } : null
      });
      
      if (semanticResult.success) {
        results.semantic = semanticResult.data;
      }
    } catch (error) {
      console.error('Lỗi tìm kiếm semantic:', error);
    }
    
    // Tìm kiếm trên Google Maps nếu có vị trí
    if (filters.location) {
      try {
        const googleResult = await googleMapsService.searchNearbyPlaces(
          filters.location,
          filters.type || 'tourist_attraction',
          filters.radius || 5000
        );
        
        if (googleResult.success) {
          results.google = googleResult.data;
        }
      } catch (error) {
        console.error('Lỗi tìm kiếm Google Maps:', error);
      }
    }
    
    // Kết hợp kết quả
    const semanticPlaces = results.semantic?.results || [];
    const googlePlaces = results.google || [];
    
    // Loại bỏ trùng lặp và sắp xếp theo độ liên quan
    const combinedResults = [
      ...semanticPlaces.map(place => ({
        source: 'pinecone',
        score: place.score,
        data: place
      })),
      ...googlePlaces.map(place => ({
        source: 'google',
        score: place.rating || 0,
        data: place
      }))
    ].sort((a, b) => b.score - a.score);
    
    results.combined = combinedResults.slice(0, 20); // Giới hạn 20 kết quả
    
    return res.status(200).json({
      success: true,
      message: 'Tìm kiếm thông minh thành công',
      data: {
        query,
        filters,
        results,
        totalResults: results.combined.length
      }
    });
    
  } catch (error) {
    console.error('Lỗi tìm kiếm thông minh:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trong quá trình tìm kiếm thông minh'
    });
  }
};

/**
 * Lấy gợi ý tìm kiếm
 */
export const getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Câu truy vấn phải có ít nhất 2 ký tự'
      });
    }
    
    // Tạo gợi ý dựa trên từ khóa phổ biến
    const suggestions = [
      'Khách sạn sang trọng',
      'Nhà hàng hải sản',
      'Điểm tham quan nổi tiếng',
      'Khu vui chơi giải trí',
      'Spa và massage',
      'Quán cà phê view đẹp',
      'Chợ đêm địa phương',
      'Bãi biển đẹp',
      'Núi và thác nước',
      'Làng nghề truyền thống'
    ].filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    );
    
    return res.status(200).json({
      success: true,
      data: {
        query,
        suggestions: suggestions.slice(0, 5)
      }
    });
    
  } catch (error) {
    console.error('Lỗi lấy gợi ý tìm kiếm:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy gợi ý tìm kiếm'
    });
  }
};

/**
 * Tính khoảng cách giữa hai điểm (Haversine formula)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default {
  semanticSearch,
  searchByCategory,
  searchNearby,
  smartSearch,
  getSearchSuggestions
};
