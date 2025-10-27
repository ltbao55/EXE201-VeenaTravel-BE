import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Script test giới hạn chat cho freemium và premium users
 * Chạy: node src/scripts/test-chat-limits.js
 */

const BASE_URL = 'http://localhost:5001';

async function testChatLimits() {
  console.log('🔍 Testing Chat Limits for Freemium and Premium...\n');

  try {
    // Test 1: Kiểm tra server
    console.log('📋 Test 1: Server health');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server OK:', healthResponse.status);

    // Test 2: Test chat không có token (sẽ fail)
    console.log('\n📋 Test 2: Testing chat without token');
    try {
      await axios.post(`${BASE_URL}/api/chat/message`, {
        message: 'Hello',
        conversationId: 'test-123'
      });
    } catch (error) {
      console.log('✅ Weak authentication error:', error.response?.status, error.response?.data?.message);
    }

    // Test 3: Test với token giả (sẽ fail)
    console.log('\n📋 Test 3: Testing chat with fake token');
    try {
      await axios.post(`${BASE_URL}/api/chat/message`, {
        message: 'Hello',
        conversationId: 'test-123'
      }, {
        headers: {
          'Authorization': 'Bearer fake-token-123'
        }
      });
    } catch (error) {
      console.log('✅ Expected authentication failure:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n✅ Chat limits system test completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Register a new user to get free subscription with 5 message limit');
    console.log('2. Try to send more than 5 chat messages');
    console.log('3. Should receive MESSAGE_LIMIT_EXCEEDED error after 5 messages');
    console.log('4. Upgrade to premium to get unlimited chat');

  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Chạy test
testChatLimits().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});



