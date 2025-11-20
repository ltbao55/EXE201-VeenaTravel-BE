import pineconeService from './pinecone-service.js';
import googleMapsService from './googlemaps-service.js';

/**
 * Service tích hợp Pinecone semantic search với Google Maps API
 * Kết hợp tìm kiếm ngữ nghĩa với thông tin chi tiết từ Google Maps
 */

/**
 * Tìm địa điểm bằng semantic search và enrichment với Google Maps data
 * @param {string} query - Câu truy vấn tìm kiếm
 * @param {Object} options - Tùy chọn tìm kiếm
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const searchPlacesWithGoogleMaps = async (query, options = {}) => {
  try {
    console.log(`🔍 Tìm kiếm tích hợp: "${query}"`);
    
    // 1. Tìm kiếm semantic trong Pinecone
    console.log('📊 Bước 1: Semantic search trong Pinecone...');
    const pineconeResult = await pineconeService.semanticSearch(query, {
      limit: options.limit || 5,
      filter: options.filter
    });
    
    if (!pineconeResult.success || !pineconeResult.data.results.length) {
      return {
        success: false,
        message: 'Không tìm thấy địa điểm phù hợp trong database'
      };
    }
    
    console.log(`✅ Tìm thấy ${pineconeResult.data.results.length} địa điểm từ Pinecone`);
    
    // 2. Enrichment với Google Maps data
    console.log('🗺️ Bước 2: Enrichment với Google Maps API...');
    const enrichedResults = [];
    
    for (const place of pineconeResult.data.results) {
      try {
        const enrichedPlace = {
          // Dữ liệu từ Pinecone
          id: place.id,
          score: place.score,
          pinecone_data: {
            name: place.metadata.name,
            description: place.metadata.description,
            category: place.metadata.category,
            tags: place.metadata.tags,
            address: place.metadata.address,
            rating: place.metadata.rating,
            coordinates: {
              lat: place.metadata.latitude,
              lng: place.metadata.longitude
            }
          },
          // Placeholder cho Google Maps data
          google_maps_data: null,
          enrichment_status: 'pending'
        };
        
        // Tìm kiếm trên Google Maps bằng tọa độ (chính xác hơn)
        const placeCoordinates = {
          lat: place.metadata.latitude,
          lng: place.metadata.longitude
        };

        console.log(`   - Searching coordinates: Lat ${placeCoordinates.lat}, Lng ${placeCoordinates.lng}`);

        // Sử dụng Nearby Search với tọa độ chính xác, bỏ qua type để tìm kiếm rộng hơn
        const nearbyResult = await googleMapsService.searchNearbyPlaces(
          placeCoordinates,
          null, // Bỏ qua type để tìm tất cả các loại địa điểm
          250 // Tăng bán kính lên 250m
        );

        let googleMapsPlace = null;
        let searchMethod = '';

        if (nearbyResult.success && nearbyResult.data.length > 0) {
          // Phương pháp 1: Nearby search thành công
          googleMapsPlace = nearbyResult.data[0];
          searchMethod = 'nearby_search';
          console.log(`   ✅ Found via nearby search: ${googleMapsPlace.name}`);
        } else {
          // Phương pháp 2: Fallback - Text search với tên địa điểm
          console.log(`   ⚠️ Nearby search failed, trying text search...`);
          const textSearchQuery = `${place.metadata.name} ${place.metadata.address}`;
          const geocodeResult = await googleMapsService.getCoordinates(textSearchQuery);

          if (geocodeResult.success && geocodeResult.data.place_id) {
            googleMapsPlace = {
              place_id: geocodeResult.data.place_id,
              name: place.metadata.name, // Sử dụng tên từ database
              geometry: {
                location: {
                  lat: geocodeResult.data.lat,
                  lng: geocodeResult.data.lng
                }
              }
            };
            searchMethod = 'text_search';
            console.log(`   ✅ Found via text search: ${place.metadata.name}`);
          }
        }

        if (googleMapsPlace) {
          // Lấy chi tiết từ Google Maps
          const detailsResult = await googleMapsService.getPlaceDetails(googleMapsPlace.place_id);

          if (detailsResult.success) {
            const distanceFromOriginal = searchMethod === 'nearby_search' ?
              calculateDistance(
                place.metadata.latitude,
                place.metadata.longitude,
                googleMapsPlace.geometry.location.lat,
                googleMapsPlace.geometry.location.lng
              ) : null;

            enrichedPlace.google_maps_data = {
              place_id: googleMapsPlace.place_id,
              name: detailsResult.data.name,
              formatted_address: detailsResult.data.formatted_address,
              rating: detailsResult.data.rating,
              user_ratings_total: detailsResult.data.user_ratings_total,
              phone: detailsResult.data.formatted_phone_number,
              website: detailsResult.data.website,
              opening_hours: detailsResult.data.opening_hours,
              price_level: detailsResult.data.price_level,
              photos: detailsResult.data.photos ? detailsResult.data.photos.slice(0, 3).map(photo => ({
                photo_reference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
              })) : [],
              reviews: detailsResult.data.reviews ? detailsResult.data.reviews.slice(0, 3).map(review => ({
                author_name: review.author_name,
                rating: review.rating,
                text: review.text,
                time: review.time
              })) : [],
              types: detailsResult.data.types,
              geometry: detailsResult.data.geometry,
              search_method: searchMethod,
              distance_from_original: distanceFromOriginal
            };
            enrichedPlace.enrichment_status = 'success';

            const distanceInfo = distanceFromOriginal ? ` (distance: ${distanceFromOriginal.toFixed(0)}m)` : '';
            console.log(`✅ Enriched: ${place.metadata.name} via ${searchMethod}${distanceInfo}`);
          } else {
            enrichedPlace.enrichment_status = 'failed_details';
            console.log(`⚠️ Không lấy được chi tiết: ${place.metadata.name}`);
          }
        } else {
          enrichedPlace.enrichment_status = 'failed_all_methods';
          console.log(`⚠️ Không tìm thấy trên Google Maps bằng cả 2 phương pháp: ${place.metadata.name}`);
        }
        
        enrichedResults.push(enrichedPlace);
        
        // Delay để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Lỗi enrichment cho ${place.metadata.name}:`, error.message);
        enrichedResults.push({
          id: place.id,
          score: place.score,
          pinecone_data: place.metadata,
          google_maps_data: null,
          enrichment_status: 'error',
          error: error.message
        });
      }
    }
    
    // 3. Thống kê kết quả
    const stats = {
      total_found: enrichedResults.length,
      enriched_successfully: enrichedResults.filter(r => r.enrichment_status === 'success').length,
      enrichment_failed: enrichedResults.filter(r => r.enrichment_status.startsWith('failed')).length,
      enrichment_errors: enrichedResults.filter(r => r.enrichment_status === 'error').length
    };
    
    console.log(`📊 Kết quả enrichment: ${stats.enriched_successfully}/${stats.total_found} thành công`);
    
    return {
      success: true,
      data: {
        query,
        results: enrichedResults,
        stats,
        search_metadata: {
          pinecone_results: pineconeResult.data.results.length,
          enrichment_rate: Math.round((stats.enriched_successfully / stats.total_found) * 100),
          searched_at: new Date().toISOString()
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm tích hợp:', error);
    return {
      success: false,
      message: `Lỗi tìm kiếm tích hợp: ${error.message}`
    };
  }
};

/**
 * Tìm địa điểm theo category với enrichment
 * @param {string} query - Câu truy vấn
 * @param {string} category - Danh mục địa điểm
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const searchByCategory = async (query, category) => {
  try {
    const filter = category ? { category: { $eq: category } } : null;
    
    return await searchPlacesWithGoogleMaps(query, {
      filter,
      limit: 8
    });
    
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm theo category:', error);
    return {
      success: false,
      message: `Lỗi tìm kiếm theo category: ${error.message}`
    };
  }
};

/**
 * Tìm địa điểm gần tọa độ cụ thể với enrichment
 * @param {string} query - Câu truy vấn
 * @param {Object} location - Tọa độ {lat, lng}
 * @param {number} radiusKm - Bán kính tìm kiếm (km)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const searchNearLocation = async (query, location, radiusKm = 10) => {
  try {
    // Tìm kiếm semantic trước
    const searchResult = await searchPlacesWithGoogleMaps(query, { limit: 10 });
    
    if (!searchResult.success) {
      return searchResult;
    }
    
    // Lọc theo khoảng cách
    const filteredResults = searchResult.data.results.filter(place => {
      const placeLat = place.pinecone_data.coordinates.lat;
      const placeLng = place.pinecone_data.coordinates.lng;
      
      // Tính khoảng cách đơn giản (Haversine)
      const distance = calculateDistance(location.lat, location.lng, placeLat, placeLng);
      place.distance_km = Math.round(distance * 100) / 100;
      
      return distance <= radiusKm;
    });
    
    // Sắp xếp theo khoảng cách
    filteredResults.sort((a, b) => a.distance_km - b.distance_km);
    
    return {
      success: true,
      data: {
        ...searchResult.data,
        results: filteredResults,
        location_filter: {
          center: location,
          radius_km: radiusKm,
          found_in_radius: filteredResults.length
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm gần location:', error);
    return {
      success: false,
      message: `Lỗi tìm kiếm gần location: ${error.message}`
    };
  }
};

/**
 * Mapping category từ Pinecone sang Google Maps place type
 */
const getGoogleMapsType = (category) => {
  const categoryMapping = {
    // 🏨 Lưu trú
    'khách sạn': 'lodging',
    'resort': 'lodging',
    'homestay': 'lodging',
    'hostel': 'lodging',
    'villa': 'lodging',
    'apartment': 'lodging',
    'khách sạn sang trọng': 'lodging',
    'khu nghỉ dưỡng': 'lodging',
    
    // 🍽️ Ẩm thực
    'nhà hàng': 'restaurant',
    'quán ăn': 'restaurant',
    'cafe': 'cafe',
    'bar': 'bar',
    'pub': 'bar',
    'bistro': 'restaurant',
    'food court': 'restaurant',
    'street food': 'meal_takeaway',
    'phố ẩm thực': 'restaurant',
    'chợ hải sản': 'restaurant',
    
    // 🎯 Điểm tham quan
    'điểm tham quan': 'tourist_attraction',
    'di tích lịch sử': 'tourist_attraction',
    'bảo tàng': 'museum',
    'chùa': 'place_of_worship',
    'nhà thờ': 'place_of_worship',
    'công viên': 'park',
    'vườn thú': 'zoo',
    'hải đăng': 'tourist_attraction',
    'khu du lịch': 'tourist_attraction',
    
    // 🏖️ Du lịch tự nhiên
    'bãi biển': 'natural_feature',
    'núi': 'natural_feature',
    'thác nước': 'natural_feature',
    'hồ': 'natural_feature',
    'sông': 'natural_feature',
    'đảo': 'natural_feature',
    'hang động': 'natural_feature',
    'rừng': 'park',
    'khu bảo tồn thiên nhiên': 'park',
    
    // 🎪 Giải trí
    'khu vui chơi': 'amusement_park',
    'công viên giải trí': 'amusement_park',
    'casino': 'casino',
    'club': 'night_club',
    'karaoke': 'night_club',
    'cinema': 'movie_theater',
    'theater': 'movie_theater',
    
    // 🛍️ Mua sắm
    'trung tâm thương mại': 'shopping_mall',
    'chợ': 'shopping_mall',
    'cửa hàng': 'store',
    'siêu thị': 'supermarket',
    'outlet': 'shopping_mall',
    'night market': 'shopping_mall',
    
    // 🏥 Dịch vụ
    'spa': 'spa',
    'massage': 'spa',
    'salon': 'beauty_salon',
    'gym': 'gym',
    'yoga': 'gym',
    'bệnh viện': 'hospital',
    'phòng khám': 'hospital',
    'ngân hàng': 'bank',
    
    // 🚗 Giao thông
    'sân bay': 'airport',
    'bến xe': 'bus_station',
    'ga tàu': 'subway_station',
    'bến cảng': 'port',
    'trạm xăng': 'gas_station',
    'bãi đỗ xe': 'parking',
    
    // 🎓 Giáo dục & Văn hóa
    'trường học': 'school',
    'thư viện': 'library',
    'trung tâm văn hóa': 'cultural_center',
    'phòng triển lãm': 'art_gallery',
    'studio': 'art_gallery',
    
    // 🏢 Công sở
    'văn phòng': 'establishment',
    'công ty': 'establishment',
    'nhà máy': 'establishment',
    'khu công nghiệp': 'establishment',
    'co-working space': 'establishment',
    
    // 🏠 Khác
    'other': 'establishment'
  };

  return categoryMapping[category?.toLowerCase()] || 'tourist_attraction';
};

/**
 * Tính khoảng cách giữa 2 điểm (Haversine formula) - trả về mét
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default {
  searchPlacesWithGoogleMaps,
  searchByCategory,
  searchNearLocation
};
