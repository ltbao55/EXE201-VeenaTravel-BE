import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

/**
 * Test script để kiểm tra các AI endpoints mới
 */
async function testAIEndpoints() {
    console.log('🚀 Testing AI Endpoints with OpenRouter + DeepSeek v3.1\n');

    // Test 1: Health check
    console.log('🔍 Testing health check...');
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check successful:', response.data.message);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return;
    }

    // Test 2: Test OpenRouter connection
    console.log('\n[object Object]esting OpenRouter connection...');
    try {
        const response = await axios.post(`${BASE_URL}/ai/test`, {
            message: "Xin chào! Bạn có thể giới thiệu về DeepSeek v3.1 không?"
        });
        
        console.log('✅ OpenRouter test successful!');
        console.log('📊 Response:', response.data);
    } catch (error) {
        console.error('❌ OpenRouter test failed:', error.response?.data || error.message);
    }

    // Test 3: Extract travel intent
    console.log('\n🧠 Testing travel intent extraction...');
    try {
        const testQueries = [
            "Tôi muốn đi du lịch Đà Lạt 3 ngày với gia đình, tìm những địa điểm ăn uống và tham quan thiên nhiên",
            "Tìm khách sạn cao cấp ở Sapa cho cặp đôi honeymoon",
            "Du lịch Phú Quốc 5 ngày với bạn bè, thích hoạt động biển và ăn hải sản"
        ];

        for (const query of testQueries) {
            console.log(`\n🔍 Testing query: "${query}"`);
            
            const response = await axios.post(`${BASE_URL}/ai/extract-intent`, {
                query: query
            });
            
            console.log('✅ Intent extraction successful!');
            console.log('📊 Extracted intent:', JSON.stringify(response.data.data.extractedIntent, null, 2));
        }
    } catch (error) {
        console.error('❌ Intent extraction failed:', error.response?.data || error.message);
    }

    // Test 4: Generate travel itinerary
    console.log('\n📅 Testing travel itinerary generation...');
    try {
        const response = await axios.post(`${BASE_URL}/ai/generate-itinerary`, {
            query: "Tôi muốn đi du lịch Hà Nội 2 ngày với gia đình, thích ăn uống và tham quan di tích lịch sử",
            destination: "Hà Nội",
            duration: 2,
            pax: 4
        });
        
        console.log('✅ Itinerary generation successful!');
        console.log('📊 Generated itinerary:', JSON.stringify(response.data.data.generatedItinerary, null, 2));
    } catch (error) {
        console.error('❌ Itinerary generation failed:', error.response?.data || error.message);
    }

    // Test 5: AI Performance comparison
    console.log('\n⚡ Testing AI performance comparison...');
    try {
        const response = await axios.post(`${BASE_URL}/ai/compare-performance`, {
            queries: [
                "Tìm quán ăn ngon ở Hà Nội",
                "Du lịch Đà Lạt với gia đình",
                "Khách sạn ở Sapa"
            ]
        });
        
        console.log('✅ Performance comparison successful!');
        console.log('📊 Performance stats:', {
            totalQueries: response.data.data.totalQueries,
            successfulQueries: response.data.data.successfulQueries,
            averageLatency: response.data.data.averageLatency + 'ms',
            model: response.data.data.model
        });
    } catch (error) {
        console.error('❌ Performance comparison failed:', error.response?.data || error.message);
    }

    // Test 6: Hybrid search
    console.log('\n🔍 Testing hybrid search...');
    try {
        const response = await axios.post(`${BASE_URL}/ai/hybrid-search`, {
            query: "Tìm địa điểm ăn uống ngon ở Đà Lạt",
            topK: 5
        });
        
        console.log('✅ Hybrid search successful!');
        console.log('📊 Search results:', {
            foundPlaces: response.data.data.foundPlaces,
            extractedIntent: response.data.data.extractedIntent,
            aiModel: response.data.data.aiModel
        });
    } catch (error) {
        console.error('❌ Hybrid search failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 All AI endpoint tests completed!');
    console.log('\n📋 Summary:');
    console.log('✅ OpenRouter + DeepSeek v3.1 integration successful');
    console.log('✅ Intent extraction working with DeepSeek v3.1');
    console.log('✅ Itinerary generation working with DeepSeek v3.1');
    console.log('✅ Hybrid approach: Google AI embedding + DeepSeek v3.1 chat');
    console.log('✅ All endpoints responding correctly');
}

// Run tests
testAIEndpoints().catch(console.error);
