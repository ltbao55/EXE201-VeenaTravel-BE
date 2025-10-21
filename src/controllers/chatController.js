import geminiService from '../services/gemini-service.js';
import integratedSearchService from '../services/integrated-search-service.js';
import hybridSearchService from '../services/hybrid-search-service.js';
import googlemapsService from '../services/googlemaps-service.js';
import cacheService from '../services/cache-service.js';
import Trip from '../models/Trip.js';
import ChatSession from '../models/ChatSession.js';
import mongoose from 'mongoose';

/**
 * Natural Language AI Chat Interface for Travel Planning
 */

/**
 * Handle chat messages about travel planning
 */
export const chatWithAI = async (req, res) => {
  try {
    const { message, conversationId, itineraryId, userId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn là bắt buộc'
      });
    }
    
    // Get userId from request or auth middleware
    const finalUserId = userId || req.user?.uid || 'anonymous';

    // BƯỚC 1: Tải lịch sử chat nếu có conversationId
    let chatHistory = [];
    let existingSession = null;

    if (conversationId) {
      try {
        existingSession = await ChatSession.findOne({ sessionId: conversationId });
        if (existingSession) {
          chatHistory = existingSession.messages || [];
          console.log(`📜 Đã tải ${chatHistory.length} tin nhắn từ phiên chat: ${conversationId}`);
        }
      } catch (error) {
        console.warn('Không thể tải lịch sử chat:', error.message);
      }
    }

    // BƯỚC 2: Xây dựng ngữ cảnh từ lịch sử chat
    let previousContext = '';
    if (chatHistory.length > 0) {
      // Lấy tối đa 10 tin nhắn gần nhất để tránh prompt quá dài
      const recentMessages = chatHistory.slice(-10);
      previousContext = recentMessages.map(msg => {
        const role = msg.role === 'user' ? 'Người dùng' : 'Em';
        return `${role}: ${msg.content}`;
      }).join('\n');

      console.log(`🧠 Đã xây dựng ngữ cảnh từ ${recentMessages.length} tin nhắn gần nhất`);
    }

    // Get itinerary context if provided
    let itineraryContext = null;
    if (itineraryId) {
      try {
        const trip = await Trip.findById(itineraryId);
        if (trip) {
          itineraryContext = trip.itinerary;
        }
      } catch (error) {
        console.warn('Không thể lấy lịch trình:', error.message);
      }
    }

    // BƯỚC 3: Generate AI response với ngữ cảnh
    const response = await generateChatResponse(message, {
      conversationId,
      itineraryContext,
      previousContext
    });

    if (!response.success) {
      return res.status(500).json({
        success: false,
        message: response.message
      });
    }

    // BƯỚC 4: Lưu tin nhắn mới vào database
    const finalConversationId = conversationId || generateConversationId();

    try {
      if (existingSession) {
        // Cập nhật phiên chat hiện có
        existingSession.messages.push(
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: response.data.response, timestamp: new Date() }
        );
        existingSession.lastActivity = new Date();
        await existingSession.save();
        console.log(`💾 Đã cập nhật phiên chat: ${finalConversationId}`);
      } else {
        // Tạo phiên chat mới
        const newSession = new ChatSession({
          sessionId: finalConversationId,
          userId: finalUserId,  // ✅ ADDED: Save userId
          messages: [
            { role: 'user', content: message, timestamp: new Date() },
            { role: 'assistant', content: response.data.response, timestamp: new Date() }
          ],
          title: message.length > 50 ? message.substring(0, 50) + '...' : message,
          lastActivity: new Date()
        });
        await newSession.save();
        console.log(`🆕 Đã tạo phiên chat mới: ${finalConversationId} cho user: ${finalUserId}`);
      }
    } catch (error) {
      console.error('Lỗi lưu tin nhắn:', error);
      // Không return lỗi ở đây để không ảnh hưởng đến response của user
    }

    return res.status(200).json({
      success: true,
      data: {
        response: response.data.response,
        conversationId: finalConversationId,
        timestamp: new Date().toISOString(),
        hasItineraryContext: !!itineraryContext,
        hasContext: chatHistory.length > 0,
        contextLength: chatHistory.length,
        suggestions: response.data.suggestions || [],
        // Separate location data for frontend map integration
        locations: response.data.locations || [],
        coordinates: response.data.coordinates || [],
        hasLocationData: response.data.hasLocationData || false,
        // Structured itinerary object for FE (if generated)
        itinerary: response.data.itinerary || null,
        tripId: response.data.tripId || null
      }
    });

  } catch (error) {
    console.error('Lỗi chat AI:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý tin nhắn'
    });
  }
};

/**
 * Generate AI response for chat
 */
const generateChatResponse = async (userMessage, options = {}) => {
  try {
    const { itineraryContext, previousContext, conversationId } = options;

    // ✨ NEW: Check if this is a follow-up response to preference question
    const isPreferenceResponse = detectPreferenceResponse(userMessage, previousContext);
    if (isPreferenceResponse) {
      console.log('💡 Detected preference response, creating itinerary with preferences...');
      const itineraryRequest = extractTravelParameters(userMessage, previousContext);
      itineraryRequest.interests = extractInterestsFromMessage(userMessage); // Add explicit interests
      return await generateStructuredItinerary(userMessage, itineraryRequest, options);
    }

    // Step 1: Check if user is asking for itinerary planning
    // Re-extract with context for better accuracy
    let itineraryRequest = detectItineraryRequest(userMessage);
    if (itineraryRequest && previousContext) {
      // Re-extract with context to get complete information
      itineraryRequest = extractTravelParameters(userMessage, previousContext);
      console.log('📅 Detected itinerary planning request with context');
    }
    
    if (itineraryRequest) {
      console.log('📅 Using structured itinerary generation...');
      return await generateStructuredItinerary(userMessage, itineraryRequest, options);
    }

    // Step 2: Check if user is asking about travel destinations/places
    const isLocationQuery = detectLocationQuery(userMessage);
    let locationData = null;

    if (isLocationQuery) {
      console.log('🔍 Detected location query, using Hybrid Search...');
      try {
        // Extract location from message if possible for location-based search
        const extractedLocation = extractLocationFromMessage(userMessage);

        let searchResult;
        if (extractedLocation) {
          console.log(`📍 Using location-based hybrid search for: ${extractedLocation.name} at ${extractedLocation.coordinates.lat}, ${extractedLocation.coordinates.lng}`);
          searchResult = await hybridSearchService.hybridSearch(userMessage, {
            partnerLimit: 2,  // Ưu tiên 2 địa điểm đối tác
            googleLimit: 8,   // Lấy thêm 8 từ Google Maps
            location: extractedLocation.coordinates
          });
        } else {
          console.log('🔍 Using general hybrid search without specific location');
          searchResult = await hybridSearchService.hybridSearch(userMessage, {
            partnerLimit: 2,
            googleLimit: 8
          });
        }

        if (searchResult.success && searchResult.data.results.length > 0) {
          locationData = searchResult.data;
          console.log(`✅ Found ${locationData.results.length} places from hybrid search (${locationData.metadata.partner_count} partners, ${locationData.metadata.google_count} Google)`);
        }
      } catch (error) {
        console.warn('⚠️ Hybrid search failed, falling back to general AI response:', error.message);
      }
    }

    // FALLBACK: If Gemini fails, return response with Pinecone data only
    if (locationData && locationData.results.length > 0) {
      console.log('📍 Using fallback response with Pinecone data');
      return {
        success: true,
        data: {
          response: generateFallbackResponse(locationData, userMessage),
          responseType: "answer",
          suggestions: ["Xem thêm địa điểm khác", "Lên kế hoạch chi tiết", "Tìm nhà hàng gần đó"],
          needsMoreInfo: false,
          actionRequired: null,
          locations: extractLocations(locationData),
          hasLocationData: true
        }
      };
    }

    // Build context for AI
    let contextPrompt = `
Em là một chuyên gia du lịch Việt Nam nhiệt tình, giàu kinh nghiệm và đầy cảm hứng. Em sẽ trò chuyện với anh/chị như một người bạn thân thiết đang chia sẻ những câu chuyện du lịch thú vị, không chỉ đơn thuần là thông tin mà còn là cảm xúc, trải nghiệm sống động.

🎯 PHONG CÁCH TRÒ CHUYỆN CỦA EM:

1. **Mở đầu cuốn hút:**
   - Luôn bắt đầu bằng một câu chào thân thiện hoặc câu hỏi gợi mở
   - Thể hiện sự phấn khích với điểm đến mà anh/chị quan tâm
   - Tạo không khí gần gũi ngay từ đầu

2. **Kể chuyện sinh động:**
   - Chia sẻ như thể em đã từng trải nghiệm những địa điểm đó
   - Mô tả chi tiết: hình ảnh, âm thanh, mùi vị, cảm giác
   - Kể những câu chuyện nhỏ, giai thoại thú vị về địa điểm
   - So sánh với những nơi khác để người nghe dễ hình dung

3. **Tư vấn chuyên sâu:**
   - Giải thích TẠI SAO nên đến, không chỉ là ĐI ĐÂU
   - Chia sẻ tips và tricks từ kinh nghiệm thực tế
   - Gợi ý thời điểm tốt nhất, tránh đông đúc
   - Cảnh báo những điều cần lưu ý

4. **Dẫn dắt hội thoại:**
   - Đặt câu hỏi để hiểu rõ hơn sở thích của anh/chị
   - Gợi ý thêm những ý tưởng mở rộng
   - Khuyến khích anh/chị chia sẻ thêm mong muốn
   - Tạo ra sự tò mò về những trải nghiệm tiếp theo

5. **Cá nhân hóa:**
   - Điều chỉnh giọng điệu theo từng người (gia đình, cặp đôi, bạn bè)
   - Nhắc đến những chi tiết cá nhân từ câu hỏi của anh/chị
   - Thể hiện sự quan tâm đến nhu cầu đặc biệt (trẻ em, người già, budget)

6. **Kết thúc cuốn hút:**
   - Luôn kết thúc bằng một câu động viên hoặc câu hỏi mở
   - Gợi ý những bước tiếp theo trong hành trình
   - Tạo cảm giác háo hức, mong chờ chuyến đi

**QUY TẮC QUAN TRỌNG:**
- Xưng "em", gọi "anh/chị"
- Trả lời DÀI (tối thiểu 200-300 từ), CHI TIẾT
- Mỗi câu trả lời phải có PERSONALITY, EMOTION, STORYTELLING
- Không chỉ liệt kê địa điểm - hãy KỂ CHUYỆN về chúng
- Dùng emoji tinh tế để tạo cảm xúc (😊 🌟 ✨ 🎉 💫)
- Tránh format cứng nhắc, hãy viết như một người bạn thân

**VÍ DỤ CÁCH KỂ CHUYỆN:**
Thay vì: "Vũng Tàu có biển đẹp"
Hãy nói: "Anh/chị à, nói đến Vũng Tàu là em nhớ ngay cái cảm giác gió biển mát lạnh lúc bình minh, khi mặt trời ló dạng từ chân trời, nhuộm cả bầu trời màu cam hồng tuyệt đẹp. Em nhớ lần đầu tiên đứng trên bãi Sau, nghe tiếng sóng vỗ, cảm giác như tất cả lo toan đều tan biến..."
`;

    // BƯỚC 3: Thêm ngữ cảnh cuộc trò chuyện trước đó và extract key info
    let contextSummary = '';
    if (previousContext && previousContext.trim()) {
      // Extract key information from context
      const contextInfo = extractContextInfo(previousContext, userMessage);
      
      contextPrompt += `

📜 THÔNG TIN TỪ CUỘC TRÒ CHUYỆN TRƯỚC:
${previousContext}

🔑 THÔNG TIN QUAN TRỌNG ĐÃ CÓ (PHẢI SỬ DỤNG):
${contextInfo}

⚠️ QUY TẮC BẮT BUỘC:
- PHẢI sử dụng thông tin trên khi trả lời
- KHÔNG hỏi lại những thông tin đã biết
- Nếu user chỉ bổ sung thông tin (như "3 ngày thôi" hoặc "đi với gia đình"), hãy KẾT HỢP với thông tin đã có để tạo câu trả lời ĐẦY ĐỦ
- Thể hiện rằng em NHỚ và HIỂU RÕ context
`;
    }

    // Add location data from Pinecone if available
    if (locationData) {
      contextPrompt += `

Tôi có một số thông tin thú vị về những địa điểm này từ database:
${locationData.results.map(place => `
• ${place.pinecone_data.name} - ${place.pinecone_data.description}
  Tọa độ: ${place.pinecone_data.coordinates.lat}, ${place.pinecone_data.coordinates.lng}
  Đánh giá: ${place.pinecone_data.rating}/5 ⭐
  ${place.google_maps_data ? `Google Maps xác nhận: ${place.google_maps_data.formatted_address}` : ''}
`).join('')}

Hãy chia sẻ về những địa điểm này một cách sinh động, như thể bạn đã từng trải nghiệm.
`;
    }

    if (itineraryContext) {
      contextPrompt += `

Người dùng đang có lịch trình: ${itineraryContext.title || 'Chuyến đi'}
Hãy tham khảo và đưa ra lời khuyên dựa trên lịch trình này.
`;
    }

    contextPrompt += `

📩 **NGƯỜI DÙNG HỎI:** "${userMessage}"

🎭 **YÊU CẦU TRẢ LỜI:**

1. **MỞ ĐẦU (2-3 câu):**
   - Chào hỏi thân thiện, thể hiện sự phấn khích
   - Hook: Một câu thu hút ngay lập tức
   - Ví dụ: "Ồ, Đà Nẵng à! Anh/chị chuẩn bị cho một chuyến đi tuyệt vời đây ạ! 😊"

2. **NỘI DUNG CHÍNH (200-300 từ):**
   - KỂ CHUYỆN về điểm đến với cảm xúc
   - Mô tả CHI TIẾT: cảnh quan, không khí, con người
   - Chia sẻ KINH NGHIỆM cá nhân hoặc câu chuyện thú vị
   - Giải thích TẠI SAO đặc biệt, KHÁC BIỆT ra sao
   - Tips thực tế: thời điểm tốt nhất, lưu ý quan trọng
   ${locationData ? '- Khi nói về địa điểm: MÔ TẢ sinh động, kể về trải nghiệm, không nhắc tọa độ/địa chỉ chi tiết' : ''}

3. **DẪN DẮT (2-3 câu):**
   - Đặt câu hỏi mở để hiểu rõ hơn
   - Gợi ý thêm ý tưởng thú vị
   - Ví dụ: "Anh/chị đi cùng gia đình hay bạn bè nè? Để em suggest thêm mấy chỗ phù hợp!"

4. **KẾT THÚC cuốn hút - BẮT BUỘC CÓ CÂU HỎI:**
   - LUÔN LUÔN kết thúc bằng 1-2 câu hỏi mở
   - Câu hỏi phải khuyến khích người dùng chia sẻ thêm
   - Tạo sự tò mò, muốn tiếp tục trò chuyện
   
   **Ví dụ câu hỏi dẫn dắt:**
   ✅ "Anh/chị đi cùng gia đình hay bạn bè nè? Để em suggest thêm!"
   ✅ "Anh/chị thích kiểu du lịch thư thái hay năng động hơn ạ?"
   ✅ "Budget của anh/chị khoảng bao nhiêu để em tư vấn phù hợp hơn nha?"
   ✅ "Các bé nhà mình bao nhiêu tuổi rồi ạ? Em sẽ gợi ý phù hợp với độ tuổi!"
   ✅ "Em còn biết thêm nhiều địa điểm hay ho nữa, anh/chị muốn nghe không?"
   
   ❌ KHÔNG được kết thúc bằng câu khẳng định
   ❌ KHÔNG được chỉ nói "Chúc anh/chị vui vẻ"
   ❌ PHẢI có câu hỏi để người dùng trả lời tiếp

**TUYỆT ĐỐI:**
✅ DÀI: Tối thiểu 200-300 từ (không kể lịch trình)
✅ HAY: Có cảm xúc, storytelling, vivid descriptions
✅ DẪN DẮT: LUÔN kết thúc bằng CÂU HỎI (REQUIRED!)
✅ CÁ NHÂN: Nhắc đến chi tiết từ câu hỏi (số người, trẻ em, sở thích)
✅ TỰ NHIÊN: Như đang chat với bạn thân, không formal
✅ ENGAGEMENT: Tạo sự tò mò, muốn trả lời tiếp

❌ KHÔNG được ngắn gọn, khô khan
❌ KHÔNG được liệt kê như danh sách
❌ KHÔNG được dùng format cứng nhắc
❌ KHÔNG được kết thúc mà KHÔNG có câu hỏi

Trả về JSON với format này, "response" phải DÀI và HAY:
{
  "response": "Câu trả lời DÀI (200-300 từ), HAY, có DẪN DẮT, đầy CẢM XÚC và STORYTELLING",
  "responseType": "answer",
  "suggestions": ["Gợi ý thú vị 1", "Gợi ý thú vị 2", "Gợi ý thú vị 3"],
  "needsMoreInfo": false,
  "actionRequired": null,
  "locations": [${locationData ? `
    {
      "id": "unique_id",
      "name": "Tên địa điểm",
      "address": "Địa chỉ đầy đủ",
      "description": "Mô tả ngắn gọn",
      "coordinates": {"lat": 10.123, "lng": 106.456},
      "type": "restaurant|hotel|attraction|beach|etc",
      "category": "food|accommodation|sightseeing|etc"
    }` : ''}
  ],
  "hasLocationData": ${!!locationData}
}
`;

    const result = await geminiService.model.generateContent(contextPrompt);
    const response = await result.response;
    const text = response.text();
    
    let parsedResponse;
    try {
      // Clean and extract JSON from AI response
      let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Try to find JSON object in the text
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }

      console.log('🔍 Attempting to parse AI response:', cleanText.substring(0, 200) + '...');
      parsedResponse = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Lỗi parse JSON từ AI:', parseError);
      console.error('Raw AI response:', text);

      // Fallback: create a simple response
      parsedResponse = {
        response: text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(),
        suggestions: [],
        hasLocationData: false,
        locations: []
      };
    }
    
    return {
      success: true,
      data: parsedResponse
    };
    
  } catch (error) {
    console.error('Lỗi tạo phản hồi chat:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tạo phản hồi'
    };
  }
};

/**
 * Modify itinerary based on chat request
 */
export const modifyItinerary = async (req, res) => {
  try {
    const { itineraryId, modification, message } = req.body;
    
    if (!itineraryId || !modification) {
      return res.status(400).json({
        success: false,
        message: 'ID lịch trình và yêu cầu thay đổi là bắt buộc'
      });
    }
    
    // Get current itinerary
    const trip = await Trip.findById(itineraryId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Use Gemini to modify itinerary
    const result = await geminiService.optimizeItinerary(trip.itinerary, modification);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    // Update trip with modified itinerary
    trip.itinerary = result.data.itinerary;
    trip.lastModified = new Date();
    await trip.save();
    
    return res.status(200).json({
      success: true,
      message: 'Lịch trình đã được cập nhật thành công',
      data: {
        itinerary: result.data.itinerary,
        modifiedAt: result.data.optimizedAt,
        originalMessage: message
      }
    });
    
  } catch (error) {
    console.error('Lỗi chỉnh sửa lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi chỉnh sửa lịch trình'
    });
  }
};

/**
 * Get travel recommendations based on location
 */
export const getRecommendations = async (req, res) => {
  try {
    const { location, interests, budget } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Vị trí là bắt buộc'
      });
    }
    
    // Get AI suggestions
    const suggestions = await geminiService.suggestPlaces(location, interests || []);
    
    if (!suggestions.success) {
      return res.status(500).json({
        success: false,
        message: suggestions.message
      });
    }
    
    // Enhance with coordinates if possible
    const enhancedSuggestions = await Promise.all(
      suggestions.data.map(async (suggestion) => {
        try {
          const coordResult = await googlemapsService.getCoordinates(
            suggestion.address || `${suggestion.name}, ${location}`
          );
          
          if (coordResult.success) {
            suggestion.coordinates = {
              lat: coordResult.data.lat,
              lng: coordResult.data.lng
            };
          }
        } catch (error) {
          console.warn('Không thể lấy tọa độ cho:', suggestion.name);
        }
        return suggestion;
      })
    );
    
    // Format locations for frontend map integration
    const locations = enhancedSuggestions.map(suggestion => ({
      id: suggestion.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: suggestion.name,
      address: suggestion.address || `${suggestion.name}, ${location}`,
      description: suggestion.description || '',
      coordinates: suggestion.coordinates || null,
      type: suggestion.type || 'recommendation',
      category: suggestion.category || 'general',
      rating: suggestion.rating || null
    }));

    return res.status(200).json({
      success: true,
      data: {
        location,
        interests,
        recommendations: enhancedSuggestions,
        locations: locations, // Separate location data for map integration
        hasLocationData: locations.length > 0,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Lỗi lấy gợi ý:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy gợi ý'
    });
  }
};

/**
 * Detect if user is asking for itinerary planning
 */
const detectItineraryRequest = (message) => {
  const itineraryKeywords = [
    'lên kế hoạch', 'lập kế hoạch', 'lịch trình', 'itinerary', 'plan',
    'kế hoạch du lịch', 'kế hoạch', 'tour', 'trip', 'tạo lịch trình'
  ];

  const lowerMessage = message.toLowerCase();

  // Check for explicit itinerary keywords
  const hasItineraryKeyword = itineraryKeywords.some(keyword => lowerMessage.includes(keyword));

  // Check for duration patterns (e.g., "3 ngày", "2 days", "1 tuần")
  const durationPattern = /(\d+)\s*(ngày|days?|tuần|weeks?|tháng|months?)/i;
  const hasDuration = durationPattern.test(message);

  // Check for planning phrases combined with destinations
  const planningPhrases = ['lên', 'tạo', 'làm', 'xây dựng'];
  const destinations = ['đà lạt', 'vũng tàu', 'nha trang', 'phú quốc', 'hà nội', 'sài gòn', 'hồ chí minh'];
  const hasPlanningWithDestination = planningPhrases.some(phrase => lowerMessage.includes(phrase)) &&
                                    destinations.some(dest => lowerMessage.includes(dest)) &&
                                    (hasDuration || lowerMessage.includes('du lịch'));

  console.log(`🔍 Itinerary Detection Debug:
    - Message: "${message}"
    - Has itinerary keyword: ${hasItineraryKeyword}
    - Has duration: ${hasDuration}
    - Has planning with destination: ${hasPlanningWithDestination}`);

  if (hasItineraryKeyword || hasDuration || hasPlanningWithDestination) {
    // Pass empty string for context here - will be passed from generateChatResponse
    const params = extractTravelParameters(message, '');
    console.log(`📋 Extracted travel parameters:`, params);
    return params;
  }

  return null;
};

/**
 * Extract travel parameters from user message
 * @param {string} message - Current user message
 * @param {string} previousContext - Previous conversation context (optional)
 */
const extractTravelParameters = (message, previousContext = '') => {
  // Combine current message with context for better extraction
  const combined = previousContext ? (previousContext + ' ' + message) : message;
  const lowerMessage = message.toLowerCase();
  const lowerCombined = combined.toLowerCase();

  // Extract duration
  const durationMatch = combined.match(/(\d+)\s*(ngày|days?|tuần|weeks?|tháng|months?)/i);
  let days = 3; // default

  if (durationMatch) {
    const number = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();

    if (unit.includes('ngày') || unit.includes('day')) {
      days = number;
    } else if (unit.includes('tuần') || unit.includes('week')) {
      days = number * 7;
    } else if (unit.includes('tháng') || unit.includes('month')) {
      days = number * 30;
    }
  }

  // Extract destination (check combined context first)
  const knownDestinations = [
    'hà nội', 'hồ chí minh', 'sài gòn', 'đà nẵng', 'vũng tàu',
    'đà lạt', 'nha trang', 'phú quốc', 'hội an', 'huế', 'hạ long',
    'phan thiết', 'quy nhơn', 'cần thơ', 'sapa', 'ninh bình'
  ];

  let destination = null;
  for (const dest of knownDestinations) {
    if (lowerCombined.includes(dest)) {
      destination = dest;
      break;
    }
  }

  // Extract interests/activities
  const interests = [];
  const interestKeywords = {
    'ăn uống': ['ăn', 'quán', 'nhà hàng', 'food', 'restaurant'],
    'tham quan': ['tham quan', 'sightseeing', 'visit', 'xem'],
    'nghỉ dưỡng': ['nghỉ', 'relax', 'resort', 'spa'],
    'mua sắm': ['mua', 'shopping', 'chợ', 'mall'],
    'thiên nhiên': ['biển', 'núi', 'thác', 'beach', 'mountain'],
    'văn hóa': ['chùa', 'đền', 'bảo tàng', 'temple', 'museum'],
    'trẻ em': ['bé', 'trẻ em', 'kid', 'children', 'vui chơi trẻ em']
  };

  for (const [interest, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some(keyword => lowerCombined.includes(keyword))) {
      interests.push(interest);
    }
  }

  // Extract group info from context
  let groupSize = 1;
  let hasKids = false;
  
  // Extract number of people
  const peopleMatch = combined.match(/(\d+)\s*(người|người lớn|adult)/);
  if (peopleMatch) {
    groupSize = parseInt(peopleMatch[1]);
  }
  
  // Check for kids
  if (lowerCombined.includes('bé') || lowerCombined.includes('trẻ em') || lowerCombined.includes('kid')) {
    hasKids = true;
    const kidsMatch = combined.match(/(\d+)\s*bé/);
    if (kidsMatch) {
      groupSize += parseInt(kidsMatch[1]);
    }
  }
  
  // Extract group type
  let groupType = 'individual';
  if (lowerCombined.includes('gia đình') || lowerCombined.includes('gia dinh') || hasKids) {
    groupType = 'family';
  } else if (lowerCombined.includes('bạn bè') || lowerCombined.includes('ban be')) {
    groupType = 'friends';
  } else if (lowerCombined.includes('cặp đôi') || lowerCombined.includes('couple')) {
    groupType = 'couple';
  }

  console.log(`📋 Extracted parameters (with context):
    - Destination: ${destination}
    - Days: ${days}
    - Group size: ${groupSize}
    - Group type: ${groupType}
    - Has kids: ${hasKids}
    - Interests: ${interests.join(', ')}`);

  return {
    destination,
    days,
    interests,
    budget: null, // Could be extracted if mentioned
    travelStyle: 'balanced',
    groupSize,
    groupType,
    hasKids
  };
};

/**
 * Generate structured itinerary using Gemini service
 */
const generateStructuredItinerary = async (userMessage, travelRequest, options = {}) => {
  try {
    const { conversationId, previousContext } = options;

    console.log('🗓️ Generating itinerary with params:', travelRequest);

    // Validate travel request
    if (!travelRequest.destination) {
      console.warn('⚠️ No destination extracted, using fallback');
      travelRequest.destination = 'Việt Nam';
    }
    if (!travelRequest.days || travelRequest.days < 1) {
      console.warn('⚠️ Invalid days, setting to 1');
      travelRequest.days = 1;
    }

    // ✨ NEW: Check if we need to ask for preferences FIRST
    const hasEnoughInfo = checkIfReadyToCreateItinerary(travelRequest, previousContext, userMessage);
    
    if (!hasEnoughInfo.ready) {
      console.log('📋 Not enough info, asking for preferences...');
      return {
        success: true,
        data: {
          response: generatePreferenceQuestion(travelRequest, hasEnoughInfo.missing),
          responseType: "preference_question",
          suggestions: generatePreferenceSuggestions(hasEnoughInfo.missing),
          needsMoreInfo: true,
          hasLocationData: false,
          missingInfo: hasEnoughInfo.missing
        }
      };
    }
    
    console.log('✅ Has enough info, creating itinerary now...');

    // Use Gemini service to generate structured itinerary
    const itineraryResult = await geminiService.generateItinerary(travelRequest);

    if (!itineraryResult.success) {
      console.error('❌ Failed to generate itinerary:', itineraryResult.message);
      
      // Return a friendly error message
      return {
        success: true,  // Still return success for chat flow
        data: {
          response: `Xin lỗi anh/chị, em gặp chút vấn đề khi tạo lịch trình ${travelRequest.destination}. Anh/chị có thể cho em biết rõ hơn về:\n- Điểm đến cụ thể\n- Số ngày dự kiến\n- Sở thích của anh/chị\n\nĐể em tạo lịch trình phù hợp hơn ạ! 😊`,
          responseType: "question",
          suggestions: [
            "Đi Vũng Tàu 1 ngày",
            "Đi Đà Lạt 2 ngày 1 đêm",
            "Khám phá Hội An 3 ngày"
          ],
          needsMoreInfo: true,
          hasLocationData: false
        }
      };
    }

    const itinerary = itineraryResult.data.itinerary;

    // ✅ STEP 1: Extract and geocode locations FIRST (before saving)
    const extractedLocations = extractLocationsFromItinerary(itinerary);
    const geocodedLocations = await geocodeLocations(extractedLocations, travelRequest.destination);

    // ✅ STEP 2: Enrich itinerary with geocoded data
    const enrichedItinerary = enrichItineraryWithGeocodedData(itinerary, geocodedLocations);

    // ✅ STEP 3: Save enriched itinerary to Trip (includes photos, coordinates, etc.)
    let tripId = null;
    try {
      const newTrip = new Trip({
        userId: new mongoose.Types.ObjectId(), // Temporary - should be actual user ID
        itinerary: enrichedItinerary,  // ← Save enriched version with geocoded data
        destination: travelRequest.destination || 'Unknown',
        interests: travelRequest.interests || [],
        status: 'active'
      });

      const savedTrip = await newTrip.save();
      tripId = savedTrip._id;
      console.log(`💾 Saved enriched itinerary to Trip: ${tripId}`);
    } catch (saveError) {
      console.warn('⚠️ Could not save trip to database:', saveError.message);
      // Continue anyway, don't fail the whole request
    }

    // Format response for chat
    const response = formatItineraryResponse(enrichedItinerary, travelRequest);

    return {
      success: true,
      data: {
        response: response,
        responseType: "itinerary",
        suggestions: [
          "Chỉnh sửa lịch trình",
          "Thêm địa điểm khác",
          "Tìm nhà hàng gần đó",
          "Xem chi tiết trên bản đồ"
        ],
        needsMoreInfo: false,
        actionRequired: null,
        locations: geocodedLocations,
        hasLocationData: true,
        itinerary: enrichedItinerary,  // ← Return enriched version with all geo data
        tripId: tripId,
        hasItineraryContext: true
      }
    };

  } catch (error) {
    console.error('❌ Error generating structured itinerary:', error);
    console.error('Stack trace:', error.stack);
    
    // Return user-friendly error in chat format
    return {
      success: true,  // Success for chat flow continuity
      data: {
        response: `Xin lỗi anh/chị, em gặp lỗi kỹ thuật khi tạo lịch trình. Anh/chị thử hỏi em một cách khác được không? Ví dụ: "Tôi muốn đi Vũng Tàu 1 ngày, thích ăn hải sản và tắm biển" 😊`,
        responseType: "error",
        suggestions: [
          "Tìm địa điểm du lịch",
          "Gợi ý nhà hàng",
          "Khách sạn view đẹp"
        ],
        hasLocationData: false
      }
    };
  }
};

/**
 * Format itinerary for chat response
 */
const formatItineraryResponse = (itinerary, travelRequest) => {
  let response = `🗓️ **Lịch trình ${travelRequest.days} ngày tại ${travelRequest.destination || 'điểm đến của bạn'}**\n\n`;

  if (itinerary.days && Array.isArray(itinerary.days)) {
    itinerary.days.forEach((day, index) => {
      response += `📅 **Ngày ${index + 1}: ${day.title || `Ngày ${index + 1}`}**\n`;

      if (day.activities && Array.isArray(day.activities)) {
        day.activities.forEach(activity => {
          // Format activity header
          if (activity.title) {
            response += `⏰ ${activity.time} - ${activity.title}\n`;
          } else {
            response += `⏰ ${activity.time}\n`;
          }
          
          if (activity.description) {
            response += `   ${activity.description}\n`;
          }
          if (activity.location) {
            response += `   📍 ${activity.location}\n`;
          }
        });
      }
      response += '\n';
    });
  }

  response += `💡 **Ghi chú:** Lịch trình này em đã tối ưu hóa dựa trên sở thích và thời gian của anh/chị rồi nhé!\n\n`;
  
  // Thêm câu hỏi dẫn dắt (BẮT BUỘC)
  const followUpQuestions = [
    `🌟 Anh/chị xem lịch trình em vừa gợi ý có ổn không ạ? Hay anh/chị muốn em điều chỉnh thêm phần nào không?`,
    `✨ Anh/chị có muốn em gợi ý thêm về chỗ ở, hoặc thêm/bớt địa điểm nào không ạ?`,
    `💫 Với lịch trình này, anh/chị thấy phù hợp chưa? Hay em cần thêm hoặc bớt ngày nào không nè?`,
    `🎯 Anh/chị có muốn em tư vấn thêm về chi phí dự kiến cho chuyến đi này không ạ?`,
    `🗺️ Anh/chị xem lịch trình trên bản đồ bên dưới nhé! Có điểm nào anh/chị muốn thay đổi không ạ?`
  ];
  
  // Random pick câu hỏi để đa dạng
  const randomQuestion = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
  response += randomQuestion;

  return response;
};

/**
 * Extract locations from itinerary for map display
 */
const extractLocationsFromItinerary = (itinerary) => {
  const locations = [];

  if (itinerary.days && Array.isArray(itinerary.days)) {
    itinerary.days.forEach((day, dayIndex) => {
      if (day.activities && Array.isArray(day.activities)) {
        day.activities.forEach((activity, actIndex) => {
          if (activity.coordinates || activity.location) {
            locations.push({
              id: `itinerary_day${dayIndex + 1}_act${actIndex + 1}`,
              source: 'itinerary',
              isPartner: false,
              name: activity.title || activity.name,
              address: activity.location || activity.address,
              description: activity.description,
              coordinates: activity.coordinates || null,
              type: activity.type || 'activity',
              category: 'itinerary',
              rating: activity.rating || null,
              time: activity.time,
              day: dayIndex + 1
            });
          }
        });
      }
    });
  }

  return locations;
};

/**
 * Geocode locations with fallback strategies and enrich with Google Places data
 * @param {Array} locations - Array of location objects
 * @param {String} destination - Destination city for fallback
 * @returns {Promise<Array>} - Locations with coordinates and enriched data
 */
const geocodeLocations = async (locations, destination = '') => {
  if (!locations || locations.length === 0) {
    return locations;
  }

  console.log(`📍 Geocoding & enriching ${locations.length} locations...`);

  // Process in batches for better performance
  const BATCH_SIZE = 5;
  const results = [];
  
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(loc => geocodeWithFallback(loc, destination))
    );
    results.push(...batchResults);
  }

  const successCount = results.filter(
    l => l.coordinates && l.coordinates.lat && l.coordinates.lng
  ).length;

  console.log(`✅ Geocoded ${successCount}/${locations.length} locations`);

  return results;
};

/**
 * ✅ Enrich itinerary with geocoded location data
 * @param {Object} itinerary - Original itinerary from AI
 * @param {Array} geocodedLocations - Locations with coordinates, photos, etc.
 * @returns {Object} - Enriched itinerary
 */
const enrichItineraryWithGeocodedData = (itinerary, geocodedLocations) => {
  if (!itinerary || !itinerary.days) {
    return itinerary;
  }

  const enrichedItinerary = JSON.parse(JSON.stringify(itinerary)); // Deep clone
  
  // Add timestamp for cache freshness tracking
  enrichedItinerary.geocoded_at = new Date().toISOString();

  // Enrich each day's activities
  enrichedItinerary.days.forEach(day => {
    if (!day.activities) return;
    
    day.activities.forEach(activity => {
      if (!activity.location) return;
      
      // Find matching geocoded location
      const geocoded = geocodedLocations.find(loc => {
        // Match by name or address
        return (loc.name && activity.location.includes(loc.name)) ||
               (loc.address && activity.location.includes(loc.address)) ||
               (activity.activity && loc.name && activity.activity.includes(loc.name));
      });

      if (geocoded) {
        // Enrich with geocoded data
        activity.coordinates = geocoded.coordinates;
        activity.place_id = geocoded.place_id;
        activity.rating = geocoded.rating;
        activity.photos = geocoded.photos;
        activity.photoUrl = geocoded.photoUrl;
        activity.formatted_address = geocoded.address || geocoded.formatted_address;
        
        console.log(`✅ Enriched activity: ${activity.location || activity.activity}`);
      } else {
        console.warn(`⚠️ Could not find geocoded data for: ${activity.location || activity.activity}`);
      }
    });
  });

  return enrichedItinerary;
};

/**
 * Geocode single location with multiple fallback strategies
 */
const geocodeWithFallback = async (loc, destination) => {
  // Skip if already has coordinates
  if (loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
    return loc;
  }

  if (!loc.address) {
    return loc;
  }

  // ✅ FILTER OUT INVALID ADDRESSES
  const invalidAddresses = [
    'khách sạn', 'nhà hàng', 'địa điểm', 'tự chọn', 'về lại điểm xuất phát',
    'nghỉ ngơi', 'nghỉ', 'tự do', 'tùy chọn', 'cửa hàng đặc sản',
    'tham khảo trên mạng', 'có thể chọn', 'tùy ý'
  ];
  
  const isInvalidAddress = invalidAddresses.some(invalid => 
    loc.address.toLowerCase().includes(invalid)
  );
  
  if (isInvalidAddress) {
    console.warn(`⚠️ Skipping invalid address: ${loc.address}`);
    return loc; // Return original without coordinates
  }

  try {
    // ✅ CHECK CACHE FIRST (7 days TTL)
    const cacheKey = `${loc.address}|${destination || ''}`;
    const cachedResult = cacheService.getCachedGeocodingResult(cacheKey);
    
    if (cachedResult) {
      console.log(`📍 Using cached geocoding for: ${loc.address}`);
      return cachedResult;
    }

    // Strategy 1: Try exact address
    console.log(`📍 Strategy 1: Geocoding "${loc.address}"`);
    let result = await googlemapsService.getCoordinates(loc.address);
    
    if (!result.success) {
      console.warn(`❌ Strategy 1 failed: ${result.message}`);
    } else {
      console.log(`✅ Strategy 1 success: ${result.data.lat}, ${result.data.lng}`);
    }
    
    // Strategy 2: Try address + destination
    if (!result.success && destination) {
      const fullAddress = `${loc.address}, ${destination}`;
      console.log(`📍 Strategy 2: Geocoding "${fullAddress}"`);
      result = await googlemapsService.getCoordinates(fullAddress);
      
      if (!result.success) {
        console.warn(`❌ Strategy 2 failed: ${result.message}`);
      } else {
        console.log(`✅ Strategy 2 success: ${result.data.lat}, ${result.data.lng}`);
      }
    }
    
    // Strategy 3: Try nearby search (if we have a city center or coordinates)
    // Also use this to get photos even if geocoding succeeded!
    if (destination) {
      try {
        // Use existing coordinates or get destination center
        let searchCenter = result.success && result.data ? result.data : null;
        
        if (!searchCenter) {
          const cityResult = await googlemapsService.getCoordinates(destination);
          if (cityResult.success && cityResult.data) {
            searchCenter = cityResult.data;
          }
        }
        
        if (searchCenter) {
          // Search nearby to find place with photos
          const nearbyResult = await googlemapsService.searchNearbyPlaces(
            { lat: searchCenter.lat, lng: searchCenter.lng },
            null, // type
            5000  // 5km radius
          );
          
          if (nearbyResult.success && nearbyResult.data && nearbyResult.data.length > 0) {
            const place = nearbyResult.data[0];
            
            if (!result.success) {
              // Use this as primary result
              result = {
                success: true,
                data: {
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng
                },
                place: place // Store for enrichment
              };
            } else {
              // Already have coordinates, just add photos
              result.place = place;
            }
          }
        }
      } catch (nearbyError) {
        console.warn(`⚠️  Nearby search failed for: ${loc.address}`);
      }
    }
    
    if (result.success && result.data) {
      // Enrich location data
      const enrichedLoc = {
        ...loc,
        coordinates: {
          lat: result.data.lat,
          lng: result.data.lng
        }
      };
      
      // Add place details if available from nearby search
      if (result.place) {
        enrichedLoc.rating = result.place.rating || loc.rating;
        enrichedLoc.user_ratings_total = result.place.user_ratings_total;
        enrichedLoc.place_id = result.place.place_id;
        
        // ✅ GET MORE PHOTOS from Place Details API (up to 10 photos instead of 1)
        if (result.place.place_id) {
          try {
            const detailsResult = await googlemapsService.getPlaceDetails(result.place.place_id);
            if (detailsResult.success && detailsResult.data.photos) {
              // Process photos with URLs
              const processedPhotos = detailsResult.data.photos.map(photo => ({
                photo_reference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
                url_small: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
                url_medium: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
                url_large: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
              }));
              
              enrichedLoc.photos = processedPhotos;
              enrichedLoc.photoUrl = processedPhotos[0]?.url_medium || processedPhotos[0]?.url_small;
            } else if (result.place.photos && result.place.photos.length > 0) {
              // Fallback to nearby search photos if details failed
              enrichedLoc.photos = result.place.photos;
              enrichedLoc.photoUrl = result.place.photos[0].url_medium || result.place.photos[0].url_small;
            }
          } catch (detailsError) {
            console.warn(`⚠️ Failed to get place details photos for: ${loc.address}`);
            // Fallback to nearby search photos
            if (result.place.photos && result.place.photos.length > 0) {
              enrichedLoc.photos = result.place.photos;
              enrichedLoc.photoUrl = result.place.photos[0].url_medium || result.place.photos[0].url_small;
            }
          }
        } else if (result.place.photos && result.place.photos.length > 0) {
          // No place_id, use nearby search photos
          enrichedLoc.photos = result.place.photos;
          enrichedLoc.photoUrl = result.place.photos[0].url_medium || result.place.photos[0].url_small;
        }
        
        // Only update name if original was empty
        if (!loc.name || loc.name === 'N/A') {
          enrichedLoc.name = result.place.name;
        }
      }
      
      // ✅ CACHE THE ENRICHED RESULT (7 days TTL)
      cacheService.cacheGeocodingResult(cacheKey, enrichedLoc);
      
      return enrichedLoc;
    }
    
  } catch (error) {
    console.error(`❌ Geocoding error for "${loc.address}":`, error.message);
    console.error(`   Full error:`, error);
  }

  // Return original if all strategies fail
  console.warn(`⚠️ All geocoding strategies failed for: ${loc.address}`);
  return loc;
};

/**
 * Detect if user message is asking about travel locations/destinations
 */
const detectLocationQuery = (message) => {
  const locationKeywords = [
    'đi đâu', 'du lịch', 'tham quan', 'địa điểm', 'chỗ nào', 'ở đâu',
    'khách sạn', 'nhà hàng', 'quán ăn', 'bãi biển', 'núi', 'thác',
    'chùa', 'đền', 'lăng', 'bảo tàng', 'công viên', 'khu du lịch',
    'resort', 'homestay', 'villa', 'hotel', 'restaurant',
    'vũng tàu', 'đà lạt', 'nha trang', 'phú quốc', 'hạ long',
    'sài gòn', 'hà nội', 'huế', 'hội an', 'đà nẵng',
    'gợi ý', 'recommend', 'suggestion'
  ];

  const lowerMessage = message.toLowerCase();
  return locationKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Generate fallback response using Pinecone data when Gemini fails
 * Note: This only generates the conversational text - location data is handled separately
 */
const generateFallbackResponse = (locationData, userMessage) => {
  const places = locationData.results.slice(0, 3); // Top 3 places

  let response = `🌟 Tôi tìm thấy ${locationData.results.length} địa điểm tuyệt vời cho bạn dựa trên yêu cầu của bạn.\n\n`;

  response += `💡 **Những gì tôi có thể giúp bạn:**\n`;
  response += `- Xem chi tiết từng địa điểm trên bản đồ\n`;
  response += `- Lên kế hoạch lịch trình chi tiết\n`;
  response += `- Tìm nhà hàng và khách sạn gần các địa điểm này\n`;
  response += `- Tư vấn thời gian tham quan và di chuyển\n\n`;

  response += `Bạn có muốn tôi tư vấn thêm về lịch trình hoặc các hoạt động cụ thể không?`;

  return response;
};

/**
 * Extract location data for frontend map integration from Hybrid Search results
 */
const extractLocations = (locationData) => {
  if (!locationData || !locationData.results) return [];

  return locationData.results.map(place => ({
    id: place.id,
    source: place.source,
    isPartner: place.isPartner,
    name: place.name,
    address: place.raw?.formatted_address || place.raw?.vicinity || place.description,
    description: place.description,
    rating: place.rating,
    coordinates: place.coordinates,
    type: place.raw?.types ? place.raw.types[0] : 'place',
    category: place.raw?.metadata?.category || 'general',
    finalScore: place.finalScore, // Add finalScore
    scoreBreakdown: place.scoreBreakdown // Add scoreBreakdown
  }));
};

/**
 * Extracts a potential location name from a user's message for location-based search.
 * This is a simplified implementation. A more robust solution would use NLP.
 */
const extractLocationFromMessage = (message) => {
  const knownLocations = {
    'hà nội': { lat: 21.028511, lng: 105.804817 },
    'hồ chí minh': { lat: 10.7769, lng: 106.7009 },
    'sài gòn': { lat: 10.7769, lng: 106.7009 },
    'đà nẵng': { lat: 16.0544, lng: 108.2022 },
    'vũng tàu': { lat: 10.3458, lng: 107.0843 },
    'đà lạt': { lat: 11.9404, lng: 108.4583 },
    'nha trang': { lat: 12.2387, lng: 109.1967 },
    'phú quốc': { lat: 10.2899, lng: 103.9568 },
    'hội an': { lat: 15.8801, lng: 108.3380 },
    'huế': { lat: 16.4637, lng: 107.5909 },
  };

  const lowerMessage = message.toLowerCase();
  for (const [name, coordinates] of Object.entries(knownLocations)) {
    if (lowerMessage.includes(name)) {
      return { name, coordinates };
    }
  }

  return null;
};

/**
 * Extract key information from conversation context
 */
const extractContextInfo = (previousContext, currentMessage) => {
  const combined = (previousContext + ' ' + currentMessage).toLowerCase();
  const info = [];
  
  // Extract destination
  const destinations = ['đà nẵng', 'hà nội', 'sài gòn', 'vũng tàu', 'đà lạt', 'nha trang', 'phú quốc', 'hội an', 'huế', 'hạ long'];
  const foundDestination = destinations.find(dest => combined.includes(dest));
  if (foundDestination) {
    info.push(`📍 Điểm đến: ${foundDestination.charAt(0).toUpperCase() + foundDestination.slice(1)}`);
  }
  
  // Extract duration
  const durationMatch = combined.match(/(\d+)\s*(ngày|đêm)/);
  if (durationMatch) {
    info.push(`⏱️ Thời gian: ${durationMatch[1]} ${durationMatch[2]}`);
  }
  
  // Extract group type
  if (combined.includes('gia đình') || combined.includes('gia dinh')) {
    info.push(`👨‍👩‍👧‍👦 Đối tượng: Gia đình`);
  } else if (combined.includes('bạn bè') || combined.includes('ban be')) {
    info.push(`👥 Đối tượng: Bạn bè`);
  } else if (combined.includes('một mình') || combined.includes('solo')) {
    info.push(`🧳 Đối tượng: Du lịch một mình`);
  } else if (combined.includes('cặp đôi') || combined.includes('couple')) {
    info.push(`💑 Đối tượng: Cặp đôi`);
  }
  
  // Extract number of people
  const peopleMatch = combined.match(/(\d+)\s*(người|người lớn|adult)/);
  if (peopleMatch) {
    info.push(`👥 Số người: ${peopleMatch[1]} người`);
  }
  
  // Extract kids
  if (combined.includes('bé') || combined.includes('trẻ em') || combined.includes('con') || combined.includes('kid')) {
    const kidsMatch = combined.match(/(\d+)\s*bé/);
    if (kidsMatch) {
      info.push(`👶 Trẻ em: ${kidsMatch[1]} bé`);
    } else {
      info.push(`👶 Có trẻ em`);
    }
  }
  
  // Extract interests
  const interests = [];
  if (combined.includes('chụp ảnh') || combined.includes('chup anh') || combined.includes('sống ảo')) {
    interests.push('chụp ảnh');
  }
  if (combined.includes('ăn uống') || combined.includes('an uong') || combined.includes('ẩm thực')) {
    interests.push('ẩm thực');
  }
  if (combined.includes('biển') || combined.includes('bãi')) {
    interests.push('biển');
  }
  if (combined.includes('núi') || combined.includes('leo núi')) {
    interests.push('núi');
  }
  if (combined.includes('văn hóa') || combined.includes('lịch sử')) {
    interests.push('văn hóa/lịch sử');
  }
  if (combined.includes('vui chơi') || combined.includes('giải trí')) {
    interests.push('vui chơi giải trí');
  }
  
  if (interests.length > 0) {
    info.push(`🎯 Sở thích: ${interests.join(', ')}`);
  }
  
  // Extract budget
  if (combined.includes('tiết kiệm') || combined.includes('rẻ')) {
    info.push(`💰 Ngân sách: Tiết kiệm`);
  } else if (combined.includes('cao cấp') || combined.includes('sang')) {
    info.push(`💰 Ngân sách: Cao cấp`);
  }
  
  if (info.length === 0) {
    return 'Chưa có thông tin cụ thể';
  }
  
  return info.join('\n');
};

/**
 * Generate conversation ID
 */
const generateConversationId = () => {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * ✨ Detect if user is responding to a preference question
 * @param {String} message - Current user message
 * @param {String} previousContext - Previous conversation
 * @returns {Boolean}
 */
const detectPreferenceResponse = (message, previousContext = '') => {
  if (!previousContext) return false;
  
  const contextLower = previousContext.toLowerCase();
  const messageLower = message.toLowerCase();
  
  // Check if previous message asked about preferences
  const askedAboutPreferences = 
    contextLower.includes('nhóm anh/chị thích') ||
    contextLower.includes('hoạt động nào') ||
    contextLower.includes('phong cách du lịch') ||
    contextLower.includes('sở thích');
  
  if (!askedAboutPreferences) return false;
  
  // Check if current message is a preference response
  const preferenceKeywords = [
    'biển', 'beach', 'thể thao nước', 'water sports',
    'văn hóa', 'culture', 'lịch sử', 'history',
    'ẩm thực', 'food', 'cafe', 'coffee',
    'giải trí', 'entertainment', 'vui chơi', 'fun',
    'thiên nhiên', 'nature', 'khám phá', 'explore',
    'nghỉ dưỡng', 'relax', 'spa'
  ];
  
  return preferenceKeywords.some(kw => messageLower.includes(kw));
};

/**
 * ✨ Extract interests from message
 * @param {String} message - User message with preferences
 * @returns {Array} Array of interests
 */
const extractInterestsFromMessage = (message) => {
  const interests = [];
  const messageLower = message.toLowerCase();
  
  const interestMap = {
    'biển': ['biển', 'beach', 'thể thao nước', 'water sport', '🏖️'],
    'văn hóa': ['văn hóa', 'culture', 'lịch sử', 'history', 'bảo tàng', 'museum', '🏛️'],
    'ẩm thực': ['ẩm thực', 'food', 'cafe', 'coffee', 'nhà hàng', 'restaurant', '🍜'],
    'giải trí': ['giải trí', 'entertainment', 'vui chơi', 'fun', 'party', '🎢'],
    'thiên nhiên': ['thiên nhiên', 'nature', 'khám phá', 'explore', 'adventure', '🏞️'],
    'nghỉ dưỡng': ['nghỉ dưỡng', 'relax', 'spa', 'resort', '💆']
  };
  
  for (const [interest, keywords] of Object.entries(interestMap)) {
    if (keywords.some(kw => messageLower.includes(kw))) {
      interests.push(interest);
    }
  }
  
  return interests;
};

/**
 * ✨ Check if we have enough info to create itinerary
 * @param {Object} travelRequest - Travel parameters
 * @param {String} previousContext - Previous conversation
 * @param {String} currentMessage - Current user message (để check format từ FE survey)
 * @returns {Object} { ready: boolean, missing: string[] }
 */
const checkIfReadyToCreateItinerary = (travelRequest, previousContext = '', currentMessage = '') => {
  const missing = [];
  
  // ✨ NEW: Check if message is from FE survey form (complete format)
  // Format: "Tôi muốn tạo lịch trình về chuyến đi [destination] trong [X] ngày với [preferences]"
  const messageLower = currentMessage.toLowerCase();
  
  // Survey format keywords (STRICT)
  const hasSurveyKeywords = 
    messageLower.includes('tạo lịch trình') || 
    messageLower.includes('tạo kế hoạch') ||
    messageLower.includes('lên lịch trình');
  
  // Check destination
  if (!travelRequest.destination || travelRequest.destination === 'Việt Nam') {
    missing.push('destination');
  }
  
  // Check if we have specific interests/preferences
  const hasSpecificInterests = travelRequest.interests && travelRequest.interests.length > 0;
  const contextLower = (previousContext || '').toLowerCase();
  
  // Preference keywords (expanded)
  const preferenceKeywords = [
    'thích', 'prefer', 'like', 'yêu thích',
    'biển', 'beach', 'bãi biển', 
    'núi', 'mountain',
    'văn hóa', 'culture', 
    'lịch sử', 'history', 'bảo tàng', 'museum',
    'ẩm thực', 'food', 'cafe', 'coffee', 'nhà hàng', 'restaurant',
    'giải trí', 'entertainment', 'vui chơi', 'fun',
    'thể thao', 'sports', 'mạo hiểm', 'adventure',
    'yên tĩnh', 'quiet', 
    'náo nhiệt', 'bustling',
    'nghỉ dưỡng', 'relax', 'spa', 'resort'
  ];
  
  const hasPreferenceInMessage = preferenceKeywords.some(kw => messageLower.includes(kw));
  const hasPreferenceInContext = preferenceKeywords.some(kw => contextLower.includes(kw));
  
  // ✨ STRICT LOGIC: Only accept as complete if:
  // 1. Has survey keywords ("tạo lịch trình") AND preferences in message
  // 2. OR has extracted interests from context (follow-up after preference question)
  if (hasSurveyKeywords && hasPreferenceInMessage) {
    console.log('✅ Detected COMPLETE survey format with preferences → Creating itinerary immediately');
    return {
      ready: true,
      missing: []
    };
  }
  
  // Original logic: If no specific interests mentioned, we need to ask
  if (!hasSpecificInterests && !hasPreferenceInContext && !hasPreferenceInMessage) {
    missing.push('preferences');
  }
  
  return {
    ready: missing.length === 0,
    missing: missing
  };
};

/**
 * ✨ Generate preference question based on missing info
 * @param {Object} travelRequest - Travel parameters
 * @param {Array} missing - Missing information
 * @returns {String} Question to ask user
 */
const generatePreferenceQuestion = (travelRequest, missing) => {
  const { destination, days, groupSize } = travelRequest;
  
  let greeting = '';
  
  if (destination && destination !== 'Việt Nam') {
    greeting = `Tuyệt vời! ${destination.charAt(0).toUpperCase() + destination.slice(1)} là một điểm đến tuyệt đẹp! `;
  } else {
    greeting = 'Tuyệt vời! Em sẽ giúp anh/chị lên kế hoạch du lịch nhé! ';
  }
  
  if (days) {
    greeting += `${days} ngày sẽ rất phù hợp để khám phá những trải nghiệm thú vị. `;
  }
  
  if (groupSize && groupSize > 1) {
    greeting += `Với nhóm ${groupSize} người, chắc chắn sẽ rất vui! `;
  }
  
  let question = '\n\n🎯 **Để em tạo lịch trình phù hợp nhất, anh/chị cho em biết thêm:**\n\n';
  
  if (missing.includes('preferences')) {
    question += '💭 **Nhóm anh/chị thích những hoạt động nào?**\n';
    question += 'Em có thể gợi ý theo sở thích của anh/chị để lịch trình thêm ý nghĩa nha!\n\n';
    question += '👇 Anh/chị chọn một trong các phong cách du lịch bên dưới, hoặc mô tả chi tiết hơn cho em nhé!';
  } else if (missing.includes('destination')) {
    question += '📍 **Anh/chị muốn đi du lịch ở đâu ạ?**\n';
    question += 'Em sẽ gợi ý lịch trình chi tiết cho địa điểm anh/chị chọn!';
  }
  
  return greeting + question;
};

/**
 * ✨ Generate preference suggestions (quick reply buttons)
 * @param {Array} missing - Missing information
 * @returns {Array} Suggestion buttons
 */
const generatePreferenceSuggestions = (missing) => {
  if (missing.includes('preferences')) {
    return [
      "🏖️ Biển & Thể thao nước",
      "🏛️ Văn hóa & Lịch sử",
      "🍜 Ẩm thực & Cafe",
      "🎢 Giải trí & Vui chơi",
      "🏞️ Thiên nhiên & Khám phá",
      "💆 Nghỉ dưỡng & Spa"
    ];
  } else if (missing.includes('destination')) {
    return [
      "Đà Nẵng",
      "Vũng Tàu",
      "Đà Lạt",
      "Nha Trang",
      "Phú Quốc",
      "Hội An"
    ];
  }
  
  return [];
};

export default {
  chatWithAI,
  modifyItinerary,
  getRecommendations
};
