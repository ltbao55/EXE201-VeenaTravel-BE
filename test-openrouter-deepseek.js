import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script để kiểm tra OpenRouter API với DeepSeek v3.1
 */
class OpenRouterTester {
    constructor() {
        // Sử dụng API key mới được cung cấp
        this.apiKey = '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';
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.model = 'deepseek/deepseek-chat'; // DeepSeek v3.1 model
    }

    /**
     * Test kết nối cơ bản với OpenRouter
     */
    async testConnection() {
        console.log('🔍 Testing OpenRouter connection...');
        
        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant. Respond in Vietnamese."
                        },
                        {
                            role: "user",
                            content: "Xin chào! Bạn có thể giới thiệu về mình không?"
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 100
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

            console.log('✅ Connection successful!');
            console.log('📊 Response data:', {
                model: response.data.model,
                usage: response.data.usage,
                response: response.data.choices[0].message.content
            });
            
            return true;
        } catch (error) {
            console.error('❌ Connection failed:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Test tính năng trích xuất ý định du lịch
     */
    async testIntentExtraction() {
        console.log('\n🧠 Testing intent extraction...');
        
        const testQuery = "Tôi muốn đi du lịch Đà Lạt 3 ngày với gia đình, tìm những địa điểm ăn uống và tham quan thiên nhiên";
        
        try {
            const prompt = this.buildIntentExtractionPrompt(testQuery);
            
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model,
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
            console.log('📝 Raw AI Response:', aiResponse);
            
            // Parse JSON response
            const intentData = this.parseJSONResponse(aiResponse);
            console.log('✅ Parsed Intent Data:', JSON.stringify(intentData, null, 2));
            
            return intentData;
        } catch (error) {
            console.error('❌ Intent extraction failed:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Test so sánh performance với model cũ
     */
    async testPerformanceComparison() {
        console.log('\n⚡ Testing performance comparison...');
        
        const testCases = [
            "Tìm quán ăn ngon ở Hà Nội",
            "Du lịch Phú Quốc 5 ngày với bạn bè",
            "Khách sạn cao cấp ở Sapa cho cặp đôi"
        ];

        for (const testCase of testCases) {
            console.log(`\n🔍 Testing: "${testCase}"`);
            
            const startTime = Date.now();
            
            try {
                const response = await axios.post(
                    `${this.baseURL}/chat/completions`,
                    {
                        model: this.model,
                        messages: [
                            {
                                role: "user",
                                content: `Phân tích ý định du lịch: ${testCase}`
                            }
                        ],
                        temperature: 0.3,
                        max_tokens: 200
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const endTime = Date.now();
                const latency = endTime - startTime;
                
                console.log(`✅ Latency: ${latency}ms`);
                console.log(`📊 Tokens used: ${response.data.usage?.total_tokens || 'N/A'}`);
                
            } catch (error) {
                console.error(`❌ Failed: ${error.message}`);
            }
        }
    }

    /**
     * Build prompt for intent extraction (same as OpenRouterService)
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
`;
    }

    /**
     * Parse JSON response (same as OpenRouterService)
     */
    parseJSONResponse(aiResponse) {
        try {
            // Remove markdown code blocks if any
            let cleanResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
            
            // Remove extra text before and after JSON
            const jsonStart = cleanResponse.indexOf('{');
            const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);
            }
            
            return JSON.parse(cleanResponse);
            
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            console.error('AI Response:', aiResponse);
            
            // Fallback: return default object
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
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting OpenRouter + DeepSeek v3.1 Tests\n');
        
        // Test 1: Basic connection
        const connectionSuccess = await this.testConnection();
        if (!connectionSuccess) {
            console.log('❌ Stopping tests due to connection failure');
            return;
        }

        // Test 2: Intent extraction
        await this.testIntentExtraction();

        // Test 3: Performance comparison
        await this.testPerformanceComparison();

        console.log('\n🎉 All tests completed!');
    }
}

// Run tests
const tester = new OpenRouterTester();
tester.runAllTests().catch(console.error);
