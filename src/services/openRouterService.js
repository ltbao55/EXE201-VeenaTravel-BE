import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service để trích xuất ý định từ câu nói tự nhiên của người dùng
 * sử dụng OpenRouter API
 */
class OpenRouterService {
    constructor() {
        // Sử dụng API key mới cho DeepSeek v3.1
        this.apiKey = process.env.OPENROUTER_API_KEY || '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';
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.model = 'deepseek/deepseek-chat'; // DeepSeek v3.1 model

        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY is required in environment variables');
        }
    }

    /**
     * Trích xuất ý định từ câu query của người dùng
     * @param {string} userQuery - Câu nói tự nhiên của người dùng
     * @returns {Promise<Object>} - Object JSON chứa ý định đã được trích xuất
     */
    async extractIntent(userQuery) {
        try {
            const prompt = this.buildIntentExtractionPrompt(userQuery);
            
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model, // Sử dụng DeepSeek v3.1
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là một AI chuyên phân tích ý định du lịch. Hãy trả về CHÍNH XÁC một object JSON hợp lệ, không có text thêm."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:5001',
                        'X-Title': 'Veena Travel Backend'
                    }
                }
            );

            const aiResponse = response.data.choices[0].message.content.trim();
            
            // Cố gắng parse JSON từ response
            const intentData = this.parseJSONResponse(aiResponse);
            
            // Validate và chuẩn hóa dữ liệu
            return this.validateAndNormalizeIntent(intentData);
            
        } catch (error) {
            console.error('Error in extractIntent:', error.message);
            throw new Error(`Failed to extract intent: ${error.message}`);
        }
    }

    /**
     * Xây dựng prompt cho việc trích xuất ý định
     * @param {string} userQuery - Câu query của người dùng
     * @returns {string} - Prompt hoàn chỉnh
     */
    buildIntentExtractionPrompt(userQuery) {
        return `
Phân tích câu nói sau của người dùng về du lịch và trích xuất thông tin thành JSON:

"${userQuery}"

Hãy trả về CHÍNH XÁC một object JSON với cấu trúc sau (không có markdown, không có text thêm):

{
    "destination": "tên địa điểm/thành phố",
    "duration": số ngày (số nguyên),
    "pax": số người (số nguyên),
    "budget": "low/medium/high hoặc null",
    "interests": ["tag1", "tag2", "tag3"],
    "accommodation": "hotel/homestay/resort hoặc null",
    "transportation": "car/motorbike/walking hoặc null",
    "travelStyle": "family/couple/solo/friends",
    "categories": ["food", "nature", "culture", "entertainment", "shopping"]
}

Quy tắc:
- destination: Tên địa điểm chính được đề cập
- duration: Số ngày du lịch (mặc định 1 nếu không rõ)
- pax: Số người (mặc định 2 nếu không rõ)
- budget: Ước tính từ ngữ cảnh hoặc null
- interests: Mảng các sở thích/hoạt động được đề cập
- accommodation: Loại chỗ ở hoặc null
- transportation: Phương tiện di chuyển hoặc null
- travelStyle: Phong cách du lịch dựa trên ngữ cảnh
- categories: Mảng các danh mục phù hợp với sở thích

Ví dụ:
Input: "Tìm quán ăn gia đình ở Đà Lạt"
Output: {"destination":"Đà Lạt","duration":1,"pax":4,"budget":null,"interests":["ăn uống","gia đình"],"accommodation":null,"transportation":null,"travelStyle":"family","categories":["food"]}
`;
    }

    /**
     * Parse JSON response từ AI, xử lý các trường hợp edge case
     * @param {string} aiResponse - Response từ AI
     * @returns {Object} - Parsed JSON object
     */
    parseJSONResponse(aiResponse) {
        try {
            // Loại bỏ markdown code blocks nếu có
            let cleanResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
            
            // Loại bỏ text thừa trước và sau JSON
            const jsonStart = cleanResponse.indexOf('{');
            const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);
            }
            
            return JSON.parse(cleanResponse);
            
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            console.error('AI Response:', aiResponse);
            
            // Fallback: trả về object mặc định
            return {
                destination: "Việt Nam",
                duration: 1,
                pax: 2,
                budget: null,
                interests: ["du lịch"],
                accommodation: null,
                transportation: null,
                travelStyle: "couple",
                categories: ["nature"]
            };
        }
    }

    /**
     * Validate và chuẩn hóa dữ liệu intent
     * @param {Object} intentData - Dữ liệu intent cần validate
     * @returns {Object} - Dữ liệu đã được validate và chuẩn hóa
     */
    validateAndNormalizeIntent(intentData) {
        const normalized = {
            destination: intentData.destination || "Việt Nam",
            duration: Math.max(1, parseInt(intentData.duration) || 1),
            pax: Math.max(1, parseInt(intentData.pax) || 2),
            budget: this.validateBudget(intentData.budget),
            interests: Array.isArray(intentData.interests) ? intentData.interests : [],
            accommodation: this.validateAccommodation(intentData.accommodation),
            transportation: this.validateTransportation(intentData.transportation),
            travelStyle: this.validateTravelStyle(intentData.travelStyle),
            categories: Array.isArray(intentData.categories) ? intentData.categories : ["nature"]
        };

        return normalized;
    }

    validateBudget(budget) {
        const validBudgets = ["low", "medium", "high"];
        return validBudgets.includes(budget) ? budget : null;
    }

    validateAccommodation(accommodation) {
        const validAccommodations = ["hotel", "homestay", "resort"];
        return validAccommodations.includes(accommodation) ? accommodation : null;
    }

    validateTransportation(transportation) {
        const validTransportations = ["car", "motorbike", "walking"];
        return validTransportations.includes(transportation) ? transportation : null;
    }

    validateTravelStyle(travelStyle) {
        const validStyles = ["family", "couple", "solo", "friends"];
        return validStyles.includes(travelStyle) ? travelStyle : "couple";
    }

    /**
     * Tạo lịch trình cuối cùng từ tất cả thông tin đã thu thập
     * @param {string} originalQuery - Query gốc của người dùng
     * @param {Array} places - Danh sách địa điểm chi tiết
     * @param {Array} durationMatrix - Ma trận thời gian di chuyển
     * @param {Object} intentData - Dữ liệu ý định đã trích xuất
     * @returns {Promise<Object>} - Lịch trình hoàn chỉnh
     */
    async generateItinerary(originalQuery, places, durationMatrix, intentData) {
        try {
            const prompt = this.buildItineraryPrompt(originalQuery, places, durationMatrix, intentData);
            
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model, // Sử dụng DeepSeek v3.1
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là chuyên gia lập kế hoạch du lịch. Hãy tạo lịch trình tối ưu và trả về CHÍNH XÁC một object JSON hợp lệ."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.5,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:5001',
                        'X-Title': 'Veena Travel Backend'
                    }
                }
            );

            const aiResponse = response.data.choices[0].message.content.trim();
            return this.parseJSONResponse(aiResponse);
            
        } catch (error) {
            console.error('Error in generateItinerary:', error.message);
            throw new Error(`Failed to generate itinerary: ${error.message}`);
        }
    }

    /**
     * Xây dựng prompt cho việc tạo lịch trình
     */
    buildItineraryPrompt(originalQuery, places, durationMatrix, intentData) {
        return `
Tạo lịch trình du lịch dựa trên:

YÊU CẦU GỐC: "${originalQuery}"

THÔNG TIN ĐÃ TRÍCH XUẤT:
${JSON.stringify(intentData, null, 2)}

DANH SÁCH ĐỊA ĐIỂM:
${JSON.stringify(places.map(p => ({
    id: p._id,
    name: p.name,
    category: p.category,
    description: p.description,
    coordinates: p.location?.coordinates
})), null, 2)}

MA TRẬN THỜI GIAN DI CHUYỂN (giây):
${JSON.stringify(durationMatrix, null, 2)}

Hãy tạo lịch trình tối ưu và trả về JSON theo cấu trúc:

{
    "title": "Tiêu đề lịch trình",
    "summary": "Tóm tắt ngắn",
    "totalDuration": ${intentData.duration},
    "estimatedBudget": "low/medium/high",
    "days": [
        {
            "day": 1,
            "title": "Tiêu đề ngày",
            "activities": [
                {
                    "time": "09:00",
                    "placeId": "id_địa_điểm",
                    "placeName": "Tên địa điểm",
                    "activity": "Hoạt động cụ thể",
                    "duration": 120,
                    "notes": "Ghi chú thêm"
                }
            ]
        }
    ],
    "tips": ["Lời khuyên 1", "Lời khuyên 2"]
}

Lưu ý:
- Sắp xếp địa điểm theo thứ tự tối ưu thời gian di chuyển
- Thời gian hợp lý cho từng hoạt động
- Phù hợp với sở thích và phong cách du lịch
- CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT THÊM
`;
    }
}

export default new OpenRouterService();
