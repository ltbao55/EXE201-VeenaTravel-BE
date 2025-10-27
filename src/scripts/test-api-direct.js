/**
 * =================================================================
 * Script test API Explore trực tiếp
 * =================================================================
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const testAPIEndpoint = async (endpoint, description) => {
  try {
    console.log(`🔍 Testing: ${description}`);
    console.log(`📡 GET http://localhost:3000${endpoint}`);
    
    const { stdout, stderr } = await execAsync(`curl -s "http://localhost:3000${endpoint}"`);
    
    if (stderr) {
      console.log(`⚠️  Warning: ${stderr}`);
    }
    
    if (stdout) {
      try {
        const data = JSON.parse(stdout);
        console.log('✅ Response:');
        console.log(JSON.stringify(data, null, 2));
        return data;
      } catch (parseError) {
        console.log('📄 Raw Response:');
        console.log(stdout);
        return stdout;
      }
    } else {
      console.log('❌ No response received');
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
};

const checkServerStatus = async () => {
  try {
    const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/explore/categories');
    return stdout.trim() === '200';
  } catch (error) {
    return false;
  }
};

const runAPITests = async () => {
  console.log('🎯 TESTING EXPLORE API ENDPOINTS');
  console.log('=================================\n');

  const tests = [
    {
      endpoint: '/api/explore/categories',
      description: 'Categories API - Lấy danh sách tất cả danh mục'
    },
    {
      endpoint: '/api/explore',
      description: 'Explore API - Lấy tất cả địa điểm'
    },
    {
      endpoint: '/api/explore?category=bảo tàng',
      description: 'Explore API - Lọc theo danh mục "bảo tàng"'
    },
    {
      endpoint: '/api/explore?category=spa',
      description: 'Explore API - Lọc theo danh mục "spa"'
    },
    {
      endpoint: '/api/explore?source=partners',
      description: 'Explore API - Chỉ lấy địa điểm đối tác'
    },
    {
      endpoint: '/api/explore?source=places',
      description: 'Explore API - Chỉ lấy địa điểm từ Places'
    },
    {
      endpoint: '/api/explore/nearby?lat=21.0285&lng=105.8542&radius=5000',
      description: 'Nearby API - Tìm địa điểm gần đây'
    },
    {
      endpoint: '/api/explore/featured',
      description: 'Featured API - Lấy địa điểm nổi bật'
    }
  ];

  for (const test of tests) {
    const result = await testAPIEndpoint(test.endpoint, test.description);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

const main = async () => {
  console.log('🔍 Checking server status...');
  
  const isServerRunning = await checkServerStatus();
  
  if (!isServerRunning) {
    console.log('❌ Server không chạy hoặc không phản hồi!');
    console.log('💡 Vui lòng chạy server trước:');
    console.log('   npm run dev');
    console.log('   hoặc');
    console.log('   npm start');
    console.log('\n📋 Sau đó chạy lại script này để test API.');
    return;
  }
  
  console.log('✅ Server đang chạy! Bắt đầu test API...\n');
  await runAPITests();
  
  console.log('🎉 Test hoàn thành!');
  console.log('💡 Hệ thống Explore đã được mở rộng với nhiều danh mục mới.');
};

main().catch(console.error);
