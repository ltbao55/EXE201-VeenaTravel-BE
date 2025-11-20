import { GoogleGenerativeAI } from '@google/generative-ai';
import pineconeService from './pinecone-service.js';

// Khởi tạo Gemini AI client
let genAI = null;
let model = null;

const initializeGemini = () => {
  const apiKey = process.env.GEMINIAPIKEY;
  
  if (!apiKey) {
    throw new Error('GEMINIAPIKEY không được cấu hình trong file .env');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash"
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Gemini AI service đã được khởi tạo thành công');
  }
};

// Đảm bảo service được khởi tạo
const ensureInitialized = () => {
  if (!genAI || !model) {
    initializeGemini();
  }
};

// Giới hạn số hoạt động mỗi ngày và ưu tiên giữ lại các bữa ăn
const normalizeItineraryActivities = (itinerary, activitiesGuide) => {
  try {
    if (!itinerary || !Array.isArray(itinerary.days)) return itinerary;
    const maxActivities = activitiesGuide?.max ?? 6;

    const isMealActivity = (activity) => {
      const text = `${activity?.activity || ''} ${activity?.location || ''}`.toLowerCase();
      return (
        text.includes('ăn sáng') ||
        text.includes('breakfast') ||
        text.includes('ăn trưa') ||
        text.includes('lunch') ||
        text.includes('ăn tối') ||
        text.includes('dinner')
      );
    };

    const sortByTime = (arr) => {
      return [...arr].sort((a, b) => {
        const ta = (a?.time || '23:59');
        const tb = (b?.time || '23:59');
        return ta.localeCompare(tb);
      });
    };

    itinerary.days.forEach((day) => {
      if (!Array.isArray(day.activities)) return;
      if (day.activities.length <= maxActivities) return;

      const meals = day.activities.filter(isMealActivity);
      const others = day.activities.filter((a) => !isMealActivity(a));

      const ordered = [...sortByTime(meals), ...sortByTime(others)];
      day.activities = ordered.slice(0, maxActivities);
    });

    return itinerary;
  } catch (_) {
    return itinerary;
  }
};

/**
 * Tìm kiếm địa điểm liên quan từ Vector Database (RAG)
 * @param {string} destination - Điểm đến
 * @param {Array} interests - Sở thích của người dùng
 * @returns {Promise<{success: boolean, data: Array}>}
 */
const retrieveRelevantPlaces = async (destination, interests = []) => {
  try {
    console.log(`🔍 RAG: Tìm kiếm địa điểm cho ${destination} với sở thích: ${interests.join(', ')}`);

    // Tạo query tìm kiếm kết hợp destination và interests
    const searchQueries = [
      destination,
      `${destination} ${interests.join(' ')}`,
      ...interests.map(interest => `${destination} ${interest}`)
    ];

    const allResults = [];

    // Tìm kiếm với nhiều query khác nhau
    for (const query of searchQueries) {
      try {
        const result = await pineconeService.semanticSearch(query, { limit: 5 });

        if (result.success && result.data.results) {
          // Lọc kết quả có điểm số cao (> 0.7)
          const relevantResults = result.data.results.filter(item => item.score > 0.7);
          allResults.push(...relevantResults);
        }
      } catch (error) {
        console.warn(`⚠️ Lỗi tìm kiếm với query "${query}":`, error.message);
      }
    }

    // Loại bỏ duplicate và sắp xếp theo điểm số
    const uniqueResults = allResults
      .filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Lấy tối đa 10 kết quả tốt nhất

    console.log(`✅ RAG: Tìm thấy ${uniqueResults.length} địa điểm liên quan`);

    return {
      success: true,
      data: uniqueResults
    };

  } catch (error) {
    console.error('❌ RAG: Lỗi tìm kiếm địa điểm:', error);
    return {
      success: false,
      data: []
    };
  }
};

/**
 * Tạo lịch trình du lịch tự động bằng Gemini AI với RAG (Retrieval-Augmented Generation)
 * @param {Object} travelRequest - Yêu cầu du lịch từ người dùng
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const generateItinerary = async (travelRequest) => {
  try {
    ensureInitialized();

    const { destination, days, budget, interests, travelStyle, groupSize } = travelRequest;

    if (!destination || !days) {
      return {
        success: false,
        message: 'Điểm đến và số ngày du lịch là bắt buộc'
      };
    }

    // BƯỚC 1: Tìm kiếm thông tin địa điểm từ Vector Database (RAG)
    console.log(`🔍 Đang tìm kiếm thông tin về ${destination} từ vector database...`);

    const relevantPlaces = await retrieveRelevantPlaces(destination, interests);
    let contextInfo = '';

    if (relevantPlaces.success && relevantPlaces.data.length > 0) {
      contextInfo = `
**THÔNG TIN ĐỊA ĐIỂM TỪ DATABASE:**
${relevantPlaces.data.map(place => `
- ${place.metadata.name}: ${place.metadata.description}
  Địa chỉ: ${place.metadata.address}
  Loại: ${place.metadata.category}
  Rating: ${place.metadata.rating}/5
`).join('')}
`;
      console.log(`✅ Tìm thấy ${relevantPlaces.data.length} địa điểm liên quan`);
    } else {
      console.log('⚠️ Không tìm thấy thông tin địa điểm từ database, sử dụng kiến thức tổng quát');
    }

    // BƯỚC 2: Tính toán số lượng activities hợp lý dựa trên số ngày
    const getOptimalActivitiesPerDay = (days) => {
      if (days === 1) return { min: 4, max: 5, description: '4-5 địa điểm (ngắn gọn, tập trung)' };
      if (days === 2) return { min: 4, max: 5, description: '4-5 địa điểm/ngày (cân bằng)' };
      if (days === 3) return { min: 4, max: 5, description: '4-5 địa điểm/ngày (đa dạng)' };
      return { min: 4, max: 6, description: '4-6 địa điểm/ngày (toàn diện)' };
    };

    const activitiesGuide = getOptimalActivitiesPerDay(days);

    // BƯỚC 3: Tạo prompt thông minh với context từ RAG
    const prompt = `
⚠️ **QUAN TRỌNG - PHẢI TUÂN THỦ:**
Điểm đến BẮT BUỘC: **${destination.toUpperCase()}**
TUYỆT ĐỐI KHÔNG được tạo lịch trình cho địa điểm khác!

Hãy tạo một lịch trình du lịch THÔNG MINH, TỐI ƯU cho chuyến đi sau:

**📋 Thông tin chuyến đi:**
- Điểm đến: ${destination} (BẮT BUỘC)
- Số ngày: ${days} ngày
- Ngân sách: ${budget || 'Không giới hạn'}
- Sở thích: ${interests || 'Du lịch tổng quát'}
- Phong cách du lịch: ${travelStyle || 'Thoải mái'}
- Số người: ${groupSize || 1} người

${contextInfo}

**🎯 QUY TẮC TỐI ƯU LỊCH TRÌNH (BẮT BUỘC):**

1. **Số lượng địa điểm hợp lý:**
   - MỖI NGÀY chỉ nên có **${activitiesGuide.min}-${activitiesGuide.max} hoạt động chính**
   - ${activitiesGuide.description}
   - KHÔNG tạo quá nhiều địa điểm làm người dùng mệt mỏi!
   
2. **Tối ưu lộ trình địa lý:**
   - Sắp xếp địa điểm theo KHU VỰC GẦN NHAU
   - Tránh di chuyển qua lại nhiều lần
   - Ưu tiên các địa điểm trên cùng 1 tuyến đường
   
3. **Thời gian hợp lý:**
   - Mỗi địa điểm: 1.5-3 giờ (tùy loại)
   - Thời gian di chuyển giữa các điểm: 15-30 phút
   - Thời gian nghỉ ăn: 1-1.5 giờ
   - Bắt đầu: 8:00-9:00, Kết thúc: 18:00-20:00

   - Bữa sáng (BẮT BUỘC nếu lịch bắt đầu ≥ 07:00): 07:00-08:00, thời lượng 30-60 phút
   - Bữa trưa (BẮT BUỘC): 11:30-13:30, thời lượng 60-90 phút
   - Bữa tối (BẮT BUỘC nếu kết thúc sau 17:00): 18:00-20:00, thời lượng 60-90 phút
   - Nghỉ giữa ngày: 15-30 phút sau mỗi 2-3 hoạt động hoặc sau ăn trưa 30-60 phút
   - Tổng thời lượng hoạt động mỗi ngày ≤ 12 giờ (không tính nghỉ đêm)
   
4. **Cân bằng hoạt động:**
   - Sáng: 1-2 địa điểm
   - Trưa: Nghỉ ăn
   - Chiều: 2-3 địa điểm
   - Tối: Ăn tối + 1 hoạt động (nếu cần)

**⚠️ NGHIÊM CẤM:**
- ❌ KHÔNG tạo quá ${activitiesGuide.max} hoạt động/ngày
- ❌ KHÔNG sắp xếp địa điểm xa nhau liên tục
- ❌ KHÔNG đặt thời gian quá gấp (< 1 giờ/địa điểm)
- ❌ PHẢI tạo lịch trình cho ${destination}, KHÔNG ĐƯỢC tạo cho địa điểm khác

**📍 QUY TẮC ĐỊA CHỈ (BẮT BUỘC):**
- ✅ Format: "Tên địa điểm cụ thể, Tên thành phố, Việt Nam"
- ✅ Ví dụ: "Chợ Bến Thành, Quận 1, Hồ Chí Minh, Việt Nam"
- ✅ Ví dụ: "Hải đăng Vũng Tàu, Vũng Tàu, Việt Nam"
- ❌ KHÔNG dùng: "Khách sạn", "Nhà hàng", "Địa điểm", "Tự chọn"
- ❌ KHÔNG dùng: "Về lại điểm xuất phát", "Nghỉ ngơi"
- ❌ KHÔNG dùng địa chỉ chung chung không có tên cụ thể

**Yêu cầu định dạng JSON:**
{
  "title": "Tên lịch trình",
  "destination": "${destination}",
  "duration": ${days},
  "overview": "Tổng quan về chuyến đi",
  "totalBudget": "Tổng ngân sách ước tính",
  "ragContext": ${relevantPlaces.success ? 'true' : 'false'},
  "days": [
    {
      "day": 1,
      "title": "Tiêu đề ngày 1",
      "activities": [
        {
          "time": "08:00",
          "activity": "Tên hoạt động",
          "location": "Tên địa điểm cụ thể, Tên thành phố, Việt Nam",
          "description": "Mô tả chi tiết",
          "estimatedCost": "Chi phí ước tính",
          "duration": "Thời gian",
          "fromDatabase": true
        }
      ]
    }
  ],
  "tips": ["Lời khuyên 1", "Lời khuyên 2"],
  "budgetBreakdown": {
    "accommodation": "Chi phí lưu trú",
    "food": "Chi phí ăn uống",
    "transportation": "Chi phí di chuyển",
    "activities": "Chi phí hoạt động",
    "others": "Chi phí khác"
  }
}

Hãy tạo lịch trình thực tế, chi tiết và phù hợp với Việt Nam. Trả về chỉ JSON không có text thêm.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    let itinerary;
    try {
      // Loại bỏ markdown formatting nếu có
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      itinerary = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Lỗi parse JSON từ Gemini:', parseError);
      return {
        success: false,
        message: 'Không thể xử lý phản hồi từ AI. Vui lòng thử lại.'
      };
    }
    
    // Chuẩn hóa: giới hạn số hoạt động/ngày theo activitiesGuide (ưu tiên bữa ăn)
    const normalizedItinerary = normalizeItineraryActivities(itinerary, activitiesGuide);

    return {
      success: true,
      data: {
        itinerary: normalizedItinerary,
        generatedAt: new Date().toISOString(),
        requestInfo: travelRequest
      }
    };
    
  } catch (error) {
    console.error('Lỗi Gemini AI:', error);
    
    if (error.message.includes('API_KEY')) {
      return {
        success: false,
        message: 'API key Gemini không hợp lệ. Vui lòng kiểm tra cấu hình.'
      };
    }
    
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tạo lịch trình. Vui lòng thử lại sau.'
    };
  }
};

/**
 * Tối ưu hóa lịch trình dựa trên phản hồi của người dùng với RAG
 * @param {Object} currentItinerary - Lịch trình hiện tại
 * @param {string} userFeedback - Phản hồi từ người dùng
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const optimizeItinerary = async (currentItinerary, userFeedback) => {
  try {
    ensureInitialized();

    if (!currentItinerary || !userFeedback) {
      return {
        success: false,
        message: 'Lịch trình hiện tại và phản hồi là bắt buộc'
      };
    }

    // RAG: Tìm kiếm thêm thông tin dựa trên feedback
    console.log('🔍 RAG: Tìm kiếm thông tin bổ sung dựa trên feedback...');
    const additionalPlaces = await retrieveRelevantPlaces(
      currentItinerary.destination,
      [userFeedback]
    );

    let contextInfo = '';
    if (additionalPlaces.success && additionalPlaces.data.length > 0) {
      contextInfo = `
**THÔNG TIN BỔ SUNG TỪ DATABASE:**
${additionalPlaces.data.map(place => `
- ${place.metadata.name}: ${place.metadata.description}
  Địa chỉ: ${place.metadata.address}
  Loại: ${place.metadata.category}
  Rating: ${place.metadata.rating}/5
`).join('')}
`;
    }

    const prompt = `
Dựa trên lịch trình hiện tại và phản hồi của người dùng, hãy tối ưu hóa lại lịch trình:

**Lịch trình hiện tại:**
${JSON.stringify(currentItinerary, null, 2)}

**Phản hồi từ người dùng:**
${userFeedback}

${contextInfo}

**HƯỚNG DẪN TỐI ƯU HÓA:**
- Ưu tiên sử dụng thông tin từ database ở trên nếu phù hợp với feedback
- Điều chỉnh lịch trình theo yêu cầu cụ thể của người dùng
- Giữ nguyên format JSON như lịch trình gốc

Hãy điều chỉnh lịch trình theo yêu cầu và trả về JSON với cùng format như trên, nhưng đã được tối ưu hóa.
Chỉ trả về JSON, không có text thêm.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let optimizedItinerary;
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      optimizedItinerary = JSON.parse(cleanText);
    } catch (parseError) {
      return {
        success: false,
        message: 'Không thể xử lý phản hồi tối ưu hóa từ AI.'
      };
    }
    
    return {
      success: true,
      data: {
        itinerary: optimizedItinerary,
        optimizedAt: new Date().toISOString(),
        userFeedback
      }
    };
    
  } catch (error) {
    console.error('Lỗi tối ưu hóa lịch trình:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tối ưu hóa lịch trình.'
    };
  }
};

/**
 * Tạo gợi ý địa điểm dựa trên sở thích với RAG
 * @param {string} location - Vị trí hiện tại
 * @param {Array} interests - Danh sách sở thích
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const suggestPlaces = async (location, interests = []) => {
  try {
    ensureInitialized();

    if (!location) {
      return {
        success: false,
        message: 'Vị trí là bắt buộc'
      };
    }

    // RAG: Tìm kiếm địa điểm thực tế từ database
    console.log(`🔍 RAG: Tìm kiếm gợi ý địa điểm cho ${location}...`);
    const relevantPlaces = await retrieveRelevantPlaces(location, interests);

    let contextInfo = '';

    if (relevantPlaces.success && relevantPlaces.data.length > 0) {
      contextInfo = `
**ĐỊA ĐIỂM THỰC TẾ TỪ DATABASE:**
${relevantPlaces.data.map(place => `
- ${place.metadata.name}: ${place.metadata.description}
  Địa chỉ: ${place.metadata.address}
  Loại: ${place.metadata.category}
  Rating: ${place.metadata.rating}/5
  Tags: ${place.metadata.tags}
`).join('')}
`;
    }

    const prompt = `
Hãy gợi ý địa điểm du lịch thú vị tại ${location} dựa trên sở thích: ${interests.join(', ')}.

${contextInfo}

**HƯỚNG DẪN:**
- Ưu tiên sử dụng các địa điểm có trong database ở trên
- Bổ sung thêm các gợi ý khác nếu cần
- Tổng cộng trả về 10 gợi ý tốt nhất

Trả về JSON format:
{
  "suggestions": [
    {
      "name": "Tên địa điểm",
      "description": "Mô tả ngắn gọn",
      "category": "Loại hình du lịch",
      "estimatedTime": "Thời gian tham quan",
      "bestTimeToVisit": "Thời gian tốt nhất",
      "tips": "Lời khuyên",
      "fromDatabase": true,
      "address": "Địa chỉ (nếu có)",
      "rating": "Đánh giá (nếu có)"
    }
  ]
}

Chỉ trả về JSON, không có text thêm.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let suggestions;
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanText);
    } catch (parseError) {
      return {
        success: false,
        message: 'Không thể xử lý gợi ý từ AI.'
      };
    }
    
    return {
      success: true,
      data: suggestions.suggestions || []
    };
    
  } catch (error) {
    console.error('Lỗi gợi ý địa điểm:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tạo gợi ý địa điểm.'
    };
  }
};

/**
 * Tìm kiếm ngữ nghĩa địa điểm (RAG endpoint)
 * @param {string} query - Câu truy vấn tìm kiếm
 * @param {Object} options - Tùy chọn tìm kiếm
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const semanticSearchPlaces = async (query, options = {}) => {
  try {
    console.log(`🔍 RAG: Semantic search cho "${query}"`);

    const result = await pineconeService.semanticSearch(query, {
      limit: options.limit || 10,
      filter: options.filter
    });

    if (!result.success) {
      return result;
    }

    // Enhance kết quả với thông tin bổ sung
    const enhancedResults = result.data.results.map(item => ({
      ...item,
      relevanceScore: item.score,
      isHighlyRelevant: item.score > 0.8,
      searchQuery: query
    }));

    return {
      success: true,
      data: {
        query,
        results: enhancedResults,
        totalResults: enhancedResults.length,
        searchedAt: new Date().toISOString(),
        ragEnabled: true
      }
    };

  } catch (error) {
    console.error('❌ RAG: Lỗi semantic search:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra trong quá trình tìm kiếm ngữ nghĩa'
    };
  }
};

export default {
  generateItinerary,
  optimizeItinerary,
  suggestPlaces,
  semanticSearchPlaces,
  retrieveRelevantPlaces,
  model: {
    generateContent: async (prompt) => {
      ensureInitialized();
      return await model.generateContent(prompt);
    }
  }
};
