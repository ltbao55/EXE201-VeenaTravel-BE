import dotenv from 'dotenv';
import googlemapsService from '../services/googlemaps-service.js';
import cacheService from '../services/cache-service.js';

// Load environment variables
dotenv.config();

/**
 * Test script để kiểm tra geocoding fix
 */
async function testGeocodingFix() {
  console.log('🧪 Testing Geocoding Fix...\n');

  // Test cases với các địa chỉ khác nhau
  const testAddresses = [
    // ✅ Good addresses (should work)
    'Hải đăng Vũng Tàu, Vũng Tàu, Việt Nam',
    'Chợ Bến Thành, Quận 1, Hồ Chí Minh, Việt Nam',
    'Nhà thờ Đức Bà, Quận 1, Hồ Chí Minh, Việt Nam',
    
    // ❌ Bad addresses (should be filtered out)
    'Khách sạn',
    'Nhà hàng',
    'Cửa hàng đặc sản (tự chọn)',
    'Về lại điểm xuất phát',
    'Nghỉ ngơi',
    'Tự do'
  ];

  console.log('📍 Testing individual addresses:');
  console.log('=' .repeat(50));

  for (const address of testAddresses) {
    console.log(`\n🔍 Testing: "${address}"`);
    
    try {
      const result = await googlemapsService.getCoordinates(address);
      
      if (result.success) {
        console.log(`✅ SUCCESS: ${result.data.lat}, ${result.data.lng}`);
        console.log(`   Formatted: ${result.data.formatted_address}`);
      } else {
        console.log(`❌ FAILED: ${result.message}`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📍 Testing with destination fallback:');
  console.log('=' .repeat(50));

  // Test với destination fallback
  const destination = 'Vũng Tàu, Việt Nam';
  
  for (const address of testAddresses.slice(0, 3)) { // Chỉ test 3 địa chỉ đầu
    console.log(`\n🔍 Testing: "${address}" + "${destination}"`);
    
    try {
      const fullAddress = `${address}, ${destination}`;
      const result = await googlemapsService.getCoordinates(fullAddress);
      
      if (result.success) {
        console.log(`✅ SUCCESS: ${result.data.lat}, ${result.data.lng}`);
        console.log(`   Formatted: ${result.data.formatted_address}`);
      } else {
        console.log(`❌ FAILED: ${result.message}`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
  }

  console.log('\n🎯 Test completed!');
}

// Chạy test
testGeocodingFix().catch(console.error);
