import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Script test API documentation
 * Chạy: node src/scripts/test-api-docs.js
 */

const BASE_URL = 'http://localhost:5001';

async function testAPIDocs() {
  console.log('🔍 Testing API Documentation...\n');

  try {
    // Đợi server khởi động
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test API docs endpoint
    console.log('📋 Testing /api/docs endpoint');
    const response = await axios.get(`${BASE_URL}/api/docs`);
    
    if (response.data.success) {
      console.log('✅ API Documentation loaded successfully!');
      console.log('\n📚 Documentation Summary:');
      console.log(`- Version: ${response.data.version}`);
      console.log(`- Message: ${response.data.message}`);
      console.log(`- Authentication Type: ${response.data.authentication.type}`);
      console.log('\n📋 Available API Categories:');
      
      const categories = ['authentication', 'users', 'plans', 'places', 'chat', 'subscriptions', 'payments', 'trips', 'search', 'admin'];
      categories.forEach(category => {
        if (response.data[category]) {
          console.log(`✅ ${category.toUpperCase()}: ${Object.keys(response.data[category].endpoints || {}).length} endpoints`);
        }
      });
      
      console.log('\n📖 To view full documentation, visit: http://localhost:5001/api/docs');
      console.log('💡 Or open in browser and format JSON for better readability');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running yet');
      console.log('💡 Wait a moment and try again, or check server logs');
    } else {
      console.error('❌ Error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
    }
  }
}

// Chạy test
testAPIDocs().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
