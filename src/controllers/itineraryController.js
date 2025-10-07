import geminiService from '../services/gemini-service.js';
import googlemapsService from '../services/googlemaps-service.js';
import Trip from '../models/Trip.js';

/**
 * Tạo lịch trình du lịch mới bằng AI với tích hợp bản đồ
 */
export const generateItinerary = async (req, res) => {
  try {
    const { query, destination, days, budget, interests, travelStyle, groupSize } = req.body;

    // Support both query-based and structured input
    let travelRequest;
    if (query) {
      // Parse natural language query
      travelRequest = await parseNaturalLanguageQuery(query);
    } else {
      // Use structured input
      if (!destination || !days) {
        return res.status(400).json({
          success: false,
          message: 'Điểm đến và số ngày du lịch là bắt buộc'
        });
      }

      if (days < 1 || days > 30) {
        return res.status(400).json({
          success: false,
          message: 'Số ngày du lịch phải từ 1 đến 30 ngày'
        });
      }

      travelRequest = {
        destination,
        days: parseInt(days),
        budget,
        interests: Array.isArray(interests) ? interests : [],
        travelStyle,
        groupSize: parseInt(groupSize) || 1
      };
    }

    // Tạo lịch trình bằng Gemini AI
    const result = await geminiService.generateItinerary(travelRequest);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    // Enhance itinerary with geographic coordinates
    const enhancedItinerary = await enhanceItineraryWithCoordinates(result.data.itinerary);

    // Lưu lịch trình vào database (tùy chọn)
    try {
      const trip = new Trip({
        title: enhancedItinerary.title,
        destination: enhancedItinerary.destination,
        duration: enhancedItinerary.duration,
        itinerary: enhancedItinerary,
        userId: req.user?._id || null, // Có thể null nếu không có auth
        status: 'draft',
        createdBy: 'ai_generated'
      });

      await trip.save();

      return res.status(201).json({
        success: true,
        message: 'Lịch trình đã được tạo thành công',
        data: {
          tripId: trip._id,
          itinerary: enhancedItinerary,
          generatedAt: result.data.generatedAt,
          hasCoordinates: true
        }
      });

    } catch (saveError) {
      console.error('Lỗi lưu lịch trình:', saveError);
      // Vẫn trả về lịch trình dù không lưu được
      return res.status(201).json({
        success: true,
        message: 'Lịch trình đã được tạo thành công (không lưu vào database)',
        data: {
          itinerary: enhancedItinerary,
          generatedAt: result.data.generatedAt,
          hasCoordinates: true
        }
      });
    }
    
  } catch (error) {
    console.error('Lỗi tạo lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo lịch trình'
    });
  }
};

/**
 * Tối ưu hóa lịch trình dựa trên phản hồi
 */
export const optimizeItinerary = async (req, res) => {
  try {
    const { tripId, feedback } = req.body;
    
    if (!tripId || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID và phản hồi là bắt buộc'
      });
    }
    
    // Lấy lịch trình hiện tại từ database
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Tối ưu hóa bằng AI
    const result = await geminiService.optimizeItinerary(trip.itinerary, feedback);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    // Cập nhật lịch trình
    trip.itinerary = result.data.itinerary;
    trip.optimizedAt = new Date();
    trip.userFeedback = feedback;
    await trip.save();
    
    return res.status(200).json({
      success: true,
      message: 'Lịch trình đã được tối ưu hóa thành công',
      data: {
        tripId: trip._id,
        itinerary: result.data.itinerary,
        optimizedAt: result.data.optimizedAt
      }
    });
    
  } catch (error) {
    console.error('Lỗi tối ưu hóa lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tối ưu hóa lịch trình'
    });
  }
};

/**
 * Gợi ý địa điểm dựa trên sở thích
 */
export const suggestPlaces = async (req, res) => {
  try {
    const { location, interests } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Vị trí là bắt buộc'
      });
    }
    
    const result = await geminiService.suggestPlaces(
      location,
      Array.isArray(interests) ? interests : []
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Gợi ý địa điểm thành công',
      data: {
        location,
        interests,
        suggestions: result.data
      }
    });
    
  } catch (error) {
    console.error('Lỗi gợi ý địa điểm:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi gợi ý địa điểm'
    });
  }
};

/**
 * Lấy danh sách lịch trình đã lưu
 */
export const getSavedItineraries = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const trips = await Trip.find({
      userId: req.user?._id || null
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('title destination duration status createdAt');
    
    const total = await Trip.countDocuments({
      userId: req.user?._id || null
    });
    
    return res.status(200).json({
      success: true,
      data: {
        trips,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Lỗi lấy danh sách lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy danh sách lịch trình'
    });
  }
};

/**
 * Lấy chi tiết lịch trình
 */
export const getItineraryDetails = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: trip
    });
    
  } catch (error) {
    console.error('Lỗi lấy chi tiết lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy chi tiết lịch trình'
    });
  }
};

/**
 * Xóa lịch trình
 */
export const deleteItinerary = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findByIdAndDelete(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Đã xóa lịch trình thành công'
    });
    
  } catch (error) {
    console.error('Lỗi xóa lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa lịch trình'
    });
  }
};

/**
 * Parse natural language query to extract travel parameters
 */
const parseNaturalLanguageQuery = async (query) => {
  try {
    const prompt = `
Phân tích câu truy vấn du lịch sau và trích xuất thông tin:
"${query}"

Trả về JSON với format:
{
  "destination": "Điểm đến chính",
  "days": số_ngày,
  "budget": "Ngân sách (nếu có)",
  "interests": ["sở thích 1", "sở thích 2"],
  "travelStyle": "Phong cách du lịch",
  "groupSize": số_người
}

Chỉ trả về JSON, không có text thêm.
`;

    const result = await geminiService.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Lỗi parse query:', error);
    // Fallback: extract basic info
    return {
      destination: query.includes('Vũng Tàu') ? 'Vũng Tàu' :
                  query.includes('Đà Lạt') ? 'Đà Lạt' :
                  query.includes('Hội An') ? 'Hội An' :
                  query.includes('Sapa') ? 'Sapa' : 'Việt Nam',
      days: extractDaysFromQuery(query),
      budget: null,
      interests: [],
      travelStyle: 'Thoải mái',
      groupSize: 1
    };
  }
};

/**
 * Extract number of days from query
 */
const extractDaysFromQuery = (query) => {
  const dayMatch = query.match(/(\d+)\s*ngày/);
  return dayMatch ? parseInt(dayMatch[1]) : 1;
};

/**
 * Enhance itinerary with geographic coordinates and route information
 */
const enhanceItineraryWithCoordinates = async (itinerary) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🗺️ Đang thêm tọa độ địa lý vào lịch trình...');
    }

    const enhancedItinerary = { ...itinerary };

    if (enhancedItinerary.days && Array.isArray(enhancedItinerary.days)) {
      for (let dayIndex = 0; dayIndex < enhancedItinerary.days.length; dayIndex++) {
        const day = enhancedItinerary.days[dayIndex];

        if (day.activities && Array.isArray(day.activities)) {
          for (let actIndex = 0; actIndex < day.activities.length; actIndex++) {
            const activity = day.activities[actIndex];

            if (activity.location) {
              try {
                // Get coordinates for the location
                const coordResult = await googlemapsService.getCoordinates(activity.location);

                if (coordResult.success) {
                  activity.coordinates = {
                    lat: coordResult.data.lat,
                    lng: coordResult.data.lng
                  };
                  activity.formatted_address = coordResult.data.formatted_address;
                  activity.place_id = coordResult.data.place_id;

                  // Get nearby places of interest
                  const nearbyResult = await googlemapsService.searchNearbyPlaces(
                    { lat: coordResult.data.lat, lng: coordResult.data.lng },
                    'tourist_attraction',
                    1000
                  );

                  if (nearbyResult.success && nearbyResult.data.length > 0) {
                    activity.nearbyPlaces = nearbyResult.data.slice(0, 3).map(place => ({
                      name: place.name,
                      rating: place.rating,
                      vicinity: place.vicinity,
                      place_id: place.place_id
                    }));
                  }
                }
              } catch (error) {
                console.warn(`⚠️ Không thể lấy tọa độ cho ${activity.location}:`, error.message);
              }
            }
          }

          // Calculate routes between activities
          if (day.activities.length > 1) {
            day.routes = [];
            for (let i = 0; i < day.activities.length - 1; i++) {
              const current = day.activities[i];
              const next = day.activities[i + 1];

              if (current.coordinates && next.coordinates) {
                try {
                  const distanceResult = await googlemapsService.getDistanceMatrix(
                    [`${current.coordinates.lat},${current.coordinates.lng}`],
                    [`${next.coordinates.lat},${next.coordinates.lng}`],
                    'driving'
                  );

                  if (distanceResult.success) {
                    const element = distanceResult.data.rows[0].elements[0];
                    day.routes.push({
                      from: current.activity,
                      to: next.activity,
                      distance: element.distance?.text || 'N/A',
                      duration: element.duration?.text || 'N/A',
                      mode: 'driving'
                    });
                  }
                } catch (error) {
                  console.warn('⚠️ Không thể tính khoảng cách:', error.message);
                }
              }
            }
          }
        }
      }
    }

    // Add map center coordinates (average of all locations)
    const allCoordinates = [];
    enhancedItinerary.days?.forEach(day => {
      day.activities?.forEach(activity => {
        if (activity.coordinates) {
          allCoordinates.push(activity.coordinates);
        }
      });
    });

    if (allCoordinates.length > 0) {
      const centerLat = allCoordinates.reduce((sum, coord) => sum + coord.lat, 0) / allCoordinates.length;
      const centerLng = allCoordinates.reduce((sum, coord) => sum + coord.lng, 0) / allCoordinates.length;

      enhancedItinerary.mapCenter = {
        lat: centerLat,
        lng: centerLng
      };

      enhancedItinerary.totalLocations = allCoordinates.length;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Đã thêm tọa độ cho ${allCoordinates.length} địa điểm`);
    }
    return enhancedItinerary;

  } catch (error) {
    console.error('❌ Lỗi thêm tọa độ:', error);
    return itinerary; // Return original if enhancement fails
  }
};

export default {
  generateItinerary,
  optimizeItinerary,
  suggestPlaces,
  getSavedItineraries,
  getItineraryDetails,
  deleteItinerary
};
