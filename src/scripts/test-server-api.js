/**
 * =================================================================
 * Script test đơn giản để kiểm tra server
 * =================================================================
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const testServer = async () => {
  console.log('🔍 Testing Explore API với server thực tế...\n');

  const tests = [
    {
      name: 'Categories API',
      command: 'curl -s http://localhost:3000/api/explore/categories',
      description: 'Lấy danh sách tất cả danh mục'
    },
    {
      name: 'Explore API - All',
      command: 'curl -s "http://localhost:3000/api/explore"',
      description: 'Lấy tất cả địa điểm'
    },
    {
      name: 'Explore API - Museum',
      command: 'curl -s "http://localhost:3000/api/explore?category=bảo tàng"',
      description: 'Lọc theo danh mục bảo tàng'
    },
    {
      name: 'Explore API - Partners',
      command: 'curl -s "http://localhost:3000/api/explore?source=partners"',
      description: 'Chỉ lấy địa điểm đối tác'
    },
    {
      name: 'Nearby API',
      command: 'curl -s "http://localhost:3000/api/explore/nearby?lat=21.0285&lng=105.8542&radius=5000"',
      description: 'Tìm địa điểm gần đây'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🎯 ${test.name}: ${test.description}`);
      console.log(`📡 ${test.command}`);
      
      const { stdout, stderr } = await execAsync(test.command);
      
      if (stderr) {
        console.log(`⚠️  Warning: ${stderr}`);
      }
      
      if (stdout) {
        try {
          const data = JSON.parse(stdout);
          console.log('✅ Response:');
          console.log(JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.log('📄 Raw Response:');
          console.log(stdout);
        }
      } else {
        console.log('❌ No response received');
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('\n' + '='.repeat(80) + '\n');
    }
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
  await testServer();
  
  console.log('🎉 Test hoàn thành!');
  console.log('💡 Hệ thống Explore đã được mở rộng với nhiều danh mục mới:');
  console.log('   🏨 Lưu trú: khách sạn, resort, homestay, hostel, villa, apartment');
  console.log('   🍽️ Ẩm thực: nhà hàng, quán ăn, cafe, bar, pub, bistro, food court, street food');
  console.log('   🎯 Điểm tham quan: điểm tham quan, di tích lịch sử, bảo tàng, chùa, nhà thờ, công viên, vườn thú');
  console.log('   🏖️ Du lịch tự nhiên: bãi biển, núi, thác nước, hồ, sông, đảo, hang động, rừng');
  console.log('   🎪 Giải trí: khu vui chơi, công viên giải trí, casino, club, karaoke, cinema, theater');
  console.log('   🛍️ Mua sắm: trung tâm thương mại, chợ, cửa hàng, siêu thị, outlet, night market');
  console.log('   🏥 Dịch vụ: spa, massage, salon, gym, yoga, bệnh viện, phòng khám, ngân hàng');
  console.log('   🚗 Giao thông: sân bay, bến xe, ga tàu, bến cảng, trạm xăng, bãi đỗ xe');
  console.log('   🎓 Giáo dục & Văn hóa: trường học, thư viện, trung tâm văn hóa, phòng triển lãm, studio');
  console.log('   🏢 Công sở: văn phòng, công ty, nhà máy, khu công nghiệp, co-working space');
};

main().catch(console.error);
