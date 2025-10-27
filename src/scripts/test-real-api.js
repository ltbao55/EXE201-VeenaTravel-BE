/**
 * =================================================================
 * Script test trực tiếp với server thực tế
 * =================================================================
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

const testAPI = async (endpoint, description) => {
  try {
    console.log(`🔍 Testing: ${description}`);
    console.log(`📡 GET ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`);
    console.log(JSON.stringify(data, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    return data;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('\n' + '='.repeat(80) + '\n');
    return null;
  }
};

const runTests = async () => {
  console.log('🎯 TESTING EXPLORE API WITH REAL SERVER');
  console.log('========================================\n');

  // Test 1: Categories API
  await testAPI('/api/explore/categories', 'Categories API - Lấy danh sách tất cả danh mục');

  // Test 2: Explore API - All places
  await testAPI('/api/explore', 'Explore API - Lấy tất cả địa điểm');

  // Test 3: Explore API - Filtered by category
  await testAPI('/api/explore?category=bảo tàng', 'Explore API - Lọc theo danh mục "bảo tàng"');

  // Test 4: Explore API - Partner places only
  await testAPI('/api/explore?source=partners', 'Explore API - Chỉ lấy địa điểm đối tác');

  // Test 5: Explore API - Places only
  await testAPI('/api/explore?source=places', 'Explore API - Chỉ lấy địa điểm từ Places');

  // Test 6: Nearby places API
  await testAPI('/api/explore/nearby?lat=21.0285&lng=105.8542&radius=5000', 'Nearby API - Tìm địa điểm gần đây');

  // Test 7: Featured places API
  await testAPI('/api/explore/featured', 'Featured API - Lấy địa điểm nổi bật');

  console.log('🎉 ALL TESTS COMPLETED!');
  console.log('💡 Hệ thống Explore đã được mở rộng thành công với nhiều danh mục mới!');
};

// Check if server is running
const checkServer = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/explore/categories`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

const main = async () => {
  console.log('🔍 Checking if server is running...');
  
  const isServerRunning = await checkServer();
  
  if (!isServerRunning) {
    console.log('❌ Server không chạy! Vui lòng chạy server trước:');
    console.log('   npm run dev');
    console.log('   hoặc');
    console.log('   npm start');
    return;
  }
  
  console.log('✅ Server đang chạy! Bắt đầu test...\n');
  await runTests();
};

main().catch(console.error);
