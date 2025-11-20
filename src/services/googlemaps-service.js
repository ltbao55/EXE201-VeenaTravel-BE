import axios from 'axios';

// Google Maps API client
let apiKey = null;

const initializeGoogleMaps = () => {
  apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY không được cấu hình trong file .env');
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Google Maps service đã được khởi tạo thành công');
  }
};

// Đảm bảo service được khởi tạo
const ensureInitialized = () => {
  if (!apiKey) {
    initializeGoogleMaps();
  }
};

/**
 * Generate Photo URL từ photo_reference
 * @param {string} photoReference - Photo reference từ Google Places API
 * @param {number} maxWidth - Max width của ảnh (default: 800px)
 * @returns {string|null} - Photo URL hoặc null nếu không có photoReference
 */
export const getPhotoUrl = (photoReference, maxWidth = 800) => {
  if (!photoReference) return null;
  
  ensureInitialized();
  
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
};

/**
 * Lấy tọa độ từ địa chỉ (Geocoding)
 * @param {string} address - Địa chỉ cần tìm tọa độ
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const getCoordinates = async (address) => {
  try {
    ensureInitialized();
    
    if (!address || typeof address !== 'string') {
      return {
        success: false,
        message: 'Địa chỉ hợp lệ là bắt buộc'
      };
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: apiKey,
        language: 'vi',
        region: 'vn'
      }
    });
    
    if (response.data.status !== 'OK' || !response.data.results.length) {
      return {
        success: false,
        message: 'Không tìm thấy tọa độ cho địa chỉ này'
      };
    }
    
    const result = response.data.results[0];
    const { lat, lng } = result.geometry.location;
    
    return {
      success: true,
      data: {
        lat,
        lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        types: result.types
      }
    };
    
  } catch (error) {
    console.error('Lỗi Google Maps Geocoding:', error);
    
    if (error.response?.status === 403) {
      return {
        success: false,
        message: 'API key Google Maps không hợp lệ hoặc bị giới hạn'
      };
    }
    
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tìm tọa độ'
    };
  }
};

/**
 * Lấy địa chỉ từ tọa độ (Reverse Geocoding)
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 * @returns {Promise<{success: boolean, data?: string, message?: string}>}
 */
export const getAddress = async (lat, lng) => {
  try {
    ensureInitialized();
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return {
        success: false,
        message: 'Tọa độ vĩ độ và kinh độ hợp lệ là bắt buộc'
      };
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: apiKey,
        language: 'vi',
        region: 'vn'
      }
    });
    
    if (response.data.status !== 'OK' || !response.data.results.length) {
      return {
        success: false,
        message: 'Không tìm thấy địa chỉ cho tọa độ này'
      };
    }
    
    return {
      success: true,
      data: response.data.results[0].formatted_address
    };
    
  } catch (error) {
    console.error('Lỗi Google Maps Reverse Geocoding:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tìm địa chỉ'
    };
  }
};

/**
 * Tìm kiếm địa điểm gần đây
 * @param {Object} location - Tọa độ {lat, lng}
 * @param {string} type - Loại địa điểm (restaurant, tourist_attraction, lodging, etc.)
 * @param {number} radius - Bán kính tìm kiếm (mét)
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const searchNearbyPlaces = async (location, type = 'tourist_attraction', radius = 5000) => {
  try {
    ensureInitialized();
    
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return {
        success: false,
        message: 'Tọa độ hợp lệ là bắt buộc'
      };
    }
    
    // Tạo params object và chỉ thêm type nếu có
    const params = {
      location: `${location.lat},${location.lng}`,
      radius: radius,
      key: apiKey,
      language: 'vi'
    };

    // Chỉ thêm type nếu được cung cấp
    if (type) {
      params.type = type;
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: params
    });
    
    if (response.data.status !== 'OK') {
      return {
        success: false,
        message: 'Không thể tìm kiếm địa điểm gần đây'
      };
    }
    
    const places = response.data.results.map(place => ({
      place_id: place.place_id,
      name: place.name,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      vicinity: place.vicinity,
      types: place.types,
      geometry: place.geometry,
      photos: place.photos ? place.photos.map(photo => ({
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        // ✅ AUTO-GENERATE photo URLs for FE
        url_small: getPhotoUrl(photo.photo_reference, 400),
        url_medium: getPhotoUrl(photo.photo_reference, 800),
        url_large: getPhotoUrl(photo.photo_reference, 1200)
      })) : [],
      price_level: place.price_level,
      opening_hours: place.opening_hours
    }));
    
    return {
      success: true,
      data: places
    };
    
  } catch (error) {
    console.error('Lỗi tìm kiếm địa điểm gần đây:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tìm kiếm địa điểm'
    };
  }
};

/**
 * Lấy chi tiết địa điểm
 * @param {string} placeId - ID của địa điểm
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const getPlaceDetails = async (placeId) => {
  try {
    ensureInitialized();
    
    if (!placeId) {
      return {
        success: false,
        message: 'Place ID là bắt buộc'
      };
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: apiKey,
        language: 'vi',
        fields: 'name,rating,formatted_phone_number,formatted_address,geometry,opening_hours,photos,price_level,reviews,types,website,user_ratings_total'
      }
    });
    
    if (response.data.status !== 'OK') {
      return {
        success: false,
        message: 'Không thể lấy chi tiết địa điểm'
      };
    }
    
    return {
      success: true,
      data: response.data.result
    };
    
  } catch (error) {
    console.error('Lỗi lấy chi tiết địa điểm:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi lấy chi tiết địa điểm'
    };
  }
};

/**
 * Tính khoảng cách và thời gian di chuyển giữa các điểm
 * @param {Array} origins - Danh sách điểm xuất phát
 * @param {Array} destinations - Danh sách điểm đến
 * @param {string} mode - Phương thức di chuyển (driving, walking, transit, bicycling)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const getDistanceMatrix = async (origins, destinations, mode = 'driving') => {
  try {
    ensureInitialized();
    
    if (!origins?.length || !destinations?.length) {
      return {
        success: false,
        message: 'Điểm xuất phát và điểm đến là bắt buộc'
      };
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origins.join('|'),
        destinations: destinations.join('|'),
        mode: mode,
        key: apiKey,
        language: 'vi',
        units: 'metric'
      }
    });
    
    if (response.data.status !== 'OK') {
      return {
        success: false,
        message: 'Không thể tính toán khoảng cách'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
    
  } catch (error) {
    console.error('Lỗi tính khoảng cách:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tính khoảng cách'
    };
  }
};

/**
 * Tìm đường đi giữa các điểm
 * @param {string} origin - Điểm xuất phát
 * @param {string} destination - Điểm đến
 * @param {string} mode - Phương thức di chuyển
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const getDirections = async (origin, destination, mode = 'driving') => {
  try {
    ensureInitialized();
    
    if (!origin || !destination) {
      return {
        success: false,
        message: 'Điểm xuất phát và điểm đến là bắt buộc'
      };
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        mode: mode,
        key: apiKey,
        language: 'vi'
      }
    });
    
    if (response.data.status !== 'OK') {
      return {
        success: false,
        message: 'Không thể tìm đường đi'
      };
    }
    
    return {
      success: true,
      data: response.data
    };
    
  } catch (error) {
    console.error('Lỗi tìm đường đi:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tìm đường đi'
    };
  }
};

export default {
  getCoordinates,
  getAddress,
  searchNearbyPlaces,
  getPlaceDetails,
  getDistanceMatrix,
  getDirections,
  getPhotoUrl
};
