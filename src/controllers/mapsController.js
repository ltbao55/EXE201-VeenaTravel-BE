import googleMapsService from '../services/googlemaps-service.js';

/**
 * Lấy tọa độ từ địa chỉ
 */
export const geocode = async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ là bắt buộc'
      });
    }
    
    const result = await googleMapsService.getCoordinates(address);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Lấy tọa độ thành công',
      data: result.data
    });
    
  } catch (error) {
    console.error('Lỗi geocoding:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy tọa độ'
    });
  }
};

/**
 * Lấy địa chỉ từ tọa độ
 */
export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Tọa độ vĩ độ và kinh độ hợp lệ là bắt buộc'
      });
    }
    
    const result = await googleMapsService.getAddress(lat, lng);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Lấy địa chỉ thành công',
      data: {
        address: result.data,
        coordinates: { lat, lng }
      }
    });
    
  } catch (error) {
    console.error('Lỗi reverse geocoding:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy địa chỉ'
    });
  }
};

/**
 * Tìm kiếm địa điểm gần đây
 */
export const searchNearby = async (req, res) => {
  try {
    const { lat, lng, type = 'tourist_attraction', radius = 5000 } = req.body;
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Tọa độ vĩ độ và kinh độ hợp lệ là bắt buộc'
      });
    }
    
    const result = await googleMapsService.searchNearbyPlaces(
      { lat, lng },
      type,
      parseInt(radius)
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    // ✅ FE-Friendly: Trả về array trực tiếp, không nest trong object
    return res.status(200).json({
      success: true,
      message: 'Tìm kiếm địa điểm gần đây thành công',
      data: result.data  // Trả trực tiếp array places với photos
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
 * Lấy chi tiết địa điểm
 */
export const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'Place ID là bắt buộc'
      });
    }
    
    const result = await googleMapsService.getPlaceDetails(placeId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết địa điểm thành công',
      data: result.data
    });
    
  } catch (error) {
    console.error('Lỗi lấy chi tiết địa điểm:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy chi tiết địa điểm'
    });
  }
};

/**
 * Tính khoảng cách và thời gian di chuyển
 */
export const getDistanceMatrix = async (req, res) => {
  try {
    const { origins, destinations, mode = 'driving' } = req.body;
    
    if (!origins?.length || !destinations?.length) {
      return res.status(400).json({
        success: false,
        message: 'Điểm xuất phát và điểm đến là bắt buộc'
      });
    }
    
    const result = await googleMapsService.getDistanceMatrix(
      origins,
      destinations,
      mode
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Tính khoảng cách thành công',
      data: result.data
    });
    
  } catch (error) {
    console.error('Lỗi tính khoảng cách:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tính khoảng cách'
    });
  }
};

/**
 * Tìm đường đi giữa các điểm
 */
export const getDirections = async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Điểm xuất phát và điểm đến là bắt buộc'
      });
    }
    
    // Convert {lat, lng} to "lat,lng" string if needed
    const formatLocation = (loc) => {
      if (typeof loc === 'string') return loc;
      if (loc.lat && loc.lng) return `${loc.lat},${loc.lng}`;
      return loc;
    };
    
    const formattedOrigin = formatLocation(origin);
    const formattedDestination = formatLocation(destination);
    
    const result = await googleMapsService.getDirections(formattedOrigin, formattedDestination, mode);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Tìm đường đi thành công',
      data: result.data
    });
    
  } catch (error) {
    console.error('Lỗi tìm đường đi:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tìm đường đi'
    });
  }
};

/**
 * Tối ưu hóa lộ trình cho nhiều điểm
 */
export const optimizeRoute = async (req, res) => {
  try {
    const { waypoints, mode = 'driving' } = req.body;
    
    if (!waypoints?.length || waypoints.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Cần ít nhất 2 điểm để tối ưu hóa lộ trình'
      });
    }
    
    if (waypoints.length > 25) {
      return res.status(400).json({
        success: false,
        message: 'Tối đa 25 điểm cho một lộ trình'
      });
    }
    
    // Tính ma trận khoảng cách giữa tất cả các điểm
    const distanceResult = await googleMapsService.getDistanceMatrix(
      waypoints,
      waypoints,
      mode
    );
    
    if (!distanceResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể tính toán ma trận khoảng cách'
      });
    }
    
    // Thuật toán tối ưu hóa đơn giản (nearest neighbor)
    const optimizedOrder = optimizeWaypoints(distanceResult.data);
    
    // Tạo lộ trình tối ưu
    const optimizedWaypoints = optimizedOrder.map(index => waypoints[index]);
    
    return res.status(200).json({
      success: true,
      message: 'Tối ưu hóa lộ trình thành công',
      data: {
        originalWaypoints: waypoints,
        optimizedWaypoints,
        optimizedOrder,
        distanceMatrix: distanceResult.data
      }
    });
    
  } catch (error) {
    console.error('Lỗi tối ưu hóa lộ trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tối ưu hóa lộ trình'
    });
  }
};

/**
 * Thuật toán tối ưu hóa waypoints đơn giản (Nearest Neighbor)
 */
const optimizeWaypoints = (distanceMatrix) => {
  const { rows } = distanceMatrix;
  const n = rows.length;
  const visited = new Array(n).fill(false);
  const route = [];
  
  // Bắt đầu từ điểm đầu tiên
  let current = 0;
  route.push(current);
  visited[current] = true;
  
  // Tìm điểm gần nhất chưa được thăm
  for (let i = 1; i < n; i++) {
    let nearest = -1;
    let minDistance = Infinity;
    
    for (let j = 0; j < n; j++) {
      if (!visited[j] && rows[current].elements[j].status === 'OK') {
        const distance = rows[current].elements[j].distance.value;
        if (distance < minDistance) {
          minDistance = distance;
          nearest = j;
        }
      }
    }
    
    if (nearest !== -1) {
      route.push(nearest);
      visited[nearest] = true;
      current = nearest;
    }
  }
  
  return route;
};

/**
 * Generate Photo URL từ photo_reference
 */
export const generatePhotoUrl = async (req, res) => {
  try {
    const { photoReference, maxWidth = 800 } = req.query;
    
    if (!photoReference) {
      return res.status(400).json({
        success: false,
        message: 'photo_reference là bắt buộc'
      });
    }
    
    const photoUrl = googleMapsService.getPhotoUrl(photoReference, parseInt(maxWidth));
    
    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tạo URL ảnh'
      });
    }
    
    res.json({
      success: true,
      data: {
        photoUrl,
        photoReference,
        maxWidth: parseInt(maxWidth)
      }
    });
    
  } catch (error) {
    console.error('Error generating photo URL:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo URL ảnh'
    });
  }
};

export default {
  geocode,
  reverseGeocode,
  searchNearby,
  getPlaceDetails,
  getDistanceMatrix,
  getDirections,
  optimizeRoute,
  generatePhotoUrl
};
