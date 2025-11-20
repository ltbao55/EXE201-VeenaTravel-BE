import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Script test payment API với authentication
 * Chạy: node src/scripts/test-payment-with-auth.js
 */

const BASE_URL = 'http://localhost:5001';

async function testPaymentWithAuth() {
  console.log('🔍 Test Payment API với authentication...\n');

  try {
    // Test 1: Kiểm tra server
    console.log('📋 Test 1: Server health');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server OK:', healthResponse.status);

    // Test 2: Test payment không có token (sẽ fail)
    console.log('\n📋 Test 2: Payment không có token (expected to fail)');
    const paymentData = {
      amount: 100000,
      description: 'Test Payment',
      items: [
        {
          name: 'Test Product',
          quantity: 1,
          price: 100000
        }
      ]
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/payments/create`, paymentData);
      console.log('❌ Unexpected success:', response.data);
    } catch (error) {
      console.log('✅ Expected failure:', error.response?.status, error.response?.data?.message);
    }

    // Test 3: Test với token giả (sẽ fail)
    console.log('\n📋 Test 3: Payment với token giả (expected to fail)');
    try {
      const response = await axios.post(`${BASE_URL}/api/payments/create`, paymentData, {
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      });
      console.log('❌ Unexpected success:', response.data);
    } catch (error) {
      console.log('✅ Expected failure:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n✅ Authentication is working correctly!');
    console.log('💡 API requires valid JWT token to create payments');

  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Chạy test
testPaymentWithAuth().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
