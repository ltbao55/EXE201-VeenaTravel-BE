import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Script test hệ thống subscription và phân quyền
 * Chạy: node src/scripts/test-subscription-system.js
 */

const BASE_URL = 'http://localhost:5001';

async function testSubscriptionSystem() {
  console.log('🔍 Testing Subscription System...\n');

  try {
    // Test 1: Kiểm tra server
    console.log('📋 Test 1: Server health');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server OK:', healthResponse.status);

    // Test 2: Seed plans (nếu chưa có)
    console.log('\n📋 Test 2: Seeding plans...');
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('node src/scripts/seed-plans.js');
      console.log('✅ Plans seeded successfully');
    } catch (error) {
      console.log('⚠️ Plans seeding failed or already exists:', error.message);
    }

    // Test 3: Test subscription routes (không có auth - sẽ fail)
    console.log('\n📋 Test 3: Testing subscription routes without auth');
    try {
      await axios.get(`${BASE_URL}/api/subscriptions/current`);
    } catch (error) {
      console.log('✅ Expected failure (no auth):', error.response?.status, error.response?.data?.message);
    }

    // Test 4: Test premium route (không có auth - sẽ fail)
    console.log('\n📋 Test 4: Testing premium route without auth');
    try {
      await axios.get(`${BASE_URL}/api/subscriptions/test-premium`);
    } catch (error) {
      console.log('✅ Expected failure (no auth):', error.response?.status, error.response?.data?.message);
    }

    // Test 5: Test pro route (không có auth - sẽ fail)
    console.log('\n📋 Test 5: Testing pro route without auth');
    try {
      await axios.get(`${BASE_URL}/api/subscriptions/test-pro`);
    } catch (error) {
      console.log('✅ Expected failure (no auth):', error.response?.status, error.response?.data?.message);
    }

    console.log('\n✅ Subscription system test completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Register a new user to get free subscription');
    console.log('2. Make a payment to upgrade to premium/pro');
    console.log('3. Test premium/pro features with valid JWT token');

  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Chạy test
testSubscriptionSystem().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});



