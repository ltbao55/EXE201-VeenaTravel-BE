import axios from 'axios';

const testDalat2Days = async () => {
  try {
    console.log('🧪 Testing: Đà Lạt 2 ngày - Kiểm tra tính hợp lý lịch trình\n');
    
    const response = await axios.post('http://localhost:5001/api/chat/message', {
      message: 'Tôi muốn đi Đà Lạt 2 ngày, thích thiên nhiên và ẩm thực, đi cùng người yêu',
      userId: 'test-dalat-' + Date.now()
    });

    if (response.data.success && response.data.data.itinerary) {
      const itinerary = response.data.data.itinerary;
      
      console.log('✅ Lịch trình đã được tạo\n');
      console.log('=' .repeat(80));
      console.log(`📍 ${itinerary.title}`);
      console.log('='.repeat(80));
      console.log(`🎯 Điểm đến: ${itinerary.destination}`);
      console.log(`📅 Thời gian: ${itinerary.duration} ngày`);
      console.log(`💰 Tổng ngân sách: ${itinerary.totalBudget}`);
      console.log(`📊 RAG Context: ${itinerary.ragContext ? 'Có' : 'Không'}\n`);
      
      // Phân tích từng ngày
      itinerary.days.forEach(day => {
        console.log('\n' + '='.repeat(80));
        console.log(`📆 NGÀY ${day.day}: ${day.title}`);
        console.log('='.repeat(80));
        
        let previousTime = null;
        let mealCount = 0;
        let restCount = 0;
        
        day.activities.forEach((activity, idx) => {
          const time = activity.time;
          const location = activity.location || activity.activity;
          const duration = activity.duration;
          const cost = activity.estimatedCost || '0 VNĐ';
          const description = activity.description || '';
          
          console.log(`\n${idx + 1}. ⏰ ${time} - ${activity.activity}`);
          console.log(`   📍 ${location}`);
          console.log(`   📝 ${description}`);
          console.log(`   ⏱️  Thời gian: ${duration}`);
          console.log(`   💵 Chi phí: ${cost}`);
          
          // Kiểm tra bữa ăn
          const isMeal = activity.activity.toLowerCase().includes('ăn') || 
                        activity.activity.toLowerCase().includes('nhà hàng') ||
                        activity.activity.toLowerCase().includes('quán') ||
                        location.toLowerCase().includes('nhà hàng') ||
                        location.toLowerCase().includes('quán');
          
          if (isMeal) {
            mealCount++;
            console.log(`   🍽️  [BỮA ĂN]`);
          }
          
          // Kiểm tra nghỉ ngơi
          const isRest = activity.activity.toLowerCase().includes('nghỉ') ||
                        activity.activity.toLowerCase().includes('check-in') ||
                        activity.activity.toLowerCase().includes('khách sạn');
          
          if (isRest) {
            restCount++;
            console.log(`   💤 [NGHỈ NGƠI]`);
          }
          
          // Tính khoảng cách thời gian
          if (previousTime) {
            const [prevHour, prevMin] = previousTime.split(':').map(Number);
            const [currHour, currMin] = time.split(':').map(Number);
            const gap = (currHour * 60 + currMin) - (prevHour * 60 + prevMin);
            
            if (gap > 0) {
              console.log(`   ⏭️  Khoảng cách: ${gap} phút từ hoạt động trước`);
            }
          }
          
          previousTime = time;
        });
        
        // Thống kê ngày
        console.log('\n' + '-'.repeat(80));
        console.log(`📊 THỐNG KÊ NGÀY ${day.day}:`);
        console.log(`   - Tổng hoạt động: ${day.activities.length}`);
        console.log(`   - Bữa ăn: ${mealCount} 🍽️`);
        console.log(`   - Nghỉ ngơi: ${restCount} 💤`);
        console.log(`   - Bắt đầu: ${day.activities[0]?.time}`);
        console.log(`   - Kết thúc: ${day.activities[day.activities.length - 1]?.time}`);
        
        // Đánh giá
        console.log('\n📋 ĐÁNH GIÁ:');
        
        // Check số lượng hoạt động
        if (day.activities.length >= 4 && day.activities.length <= 6) {
          console.log(`   ✅ Số lượng hoạt động hợp lý (${day.activities.length} hoạt động)`);
        } else if (day.activities.length < 4) {
          console.log(`   ⚠️  Ít hoạt động (${day.activities.length} hoạt động)`);
        } else {
          console.log(`   ⚠️  Nhiều hoạt động (${day.activities.length} hoạt động)`);
        }
        
        // Check bữa ăn
        if (mealCount >= 2) {
          console.log(`   ✅ Có đủ bữa ăn (${mealCount} bữa)`);
        } else {
          console.log(`   ⚠️  Thiếu bữa ăn (chỉ ${mealCount} bữa)`);
        }
        
        // Check thời gian
        const startTime = day.activities[0]?.time;
        const [startHour] = startTime.split(':').map(Number);
        
        if (startHour >= 7 && startHour <= 9) {
          console.log(`   ✅ Thời gian bắt đầu hợp lý (${startTime})`);
        } else {
          console.log(`   ⚠️  Thời gian bắt đầu không tối ưu (${startTime})`);
        }
      });
      
      // Tổng kết
      console.log('\n' + '='.repeat(80));
      console.log('📊 TỔNG KẾT LỊCH TRÌNH');
      console.log('='.repeat(80));
      
      const totalActivities = itinerary.days.reduce((sum, day) => sum + day.activities.length, 0);
      const avgActivities = (totalActivities / itinerary.days.length).toFixed(1);
      
      console.log(`\n📈 Thống kê tổng quan:`);
      console.log(`   - Tổng số hoạt động: ${totalActivities}`);
      console.log(`   - Trung bình/ngày: ${avgActivities} hoạt động`);
      console.log(`   - Có RAG context: ${itinerary.ragContext ? 'Có ✅' : 'Không ❌'}`);
      
      console.log(`\n💡 Tips từ AI:`);
      itinerary.tips?.forEach((tip, idx) => {
        console.log(`   ${idx + 1}. ${tip}`);
      });
      
      if (itinerary.budgetBreakdown) {
        console.log(`\n💰 Phân bổ ngân sách:`);
        Object.entries(itinerary.budgetBreakdown).forEach(([key, value]) => {
          const label = {
            'accommodation': 'Lưu trú',
            'food': 'Ăn uống',
            'transportation': 'Di chuyển',
            'activities': 'Hoạt động',
            'others': 'Khác'
          }[key] || key;
          console.log(`   - ${label}: ${value}`);
        });
      }
      
      // Đánh giá tổng thể
      console.log('\n' + '='.repeat(80));
      console.log('🎯 ĐÁNH GIÁ TỔNG THỂ');
      console.log('='.repeat(80));
      
      const issues = [];
      const strengths = [];
      
      // Check activities per day
      if (avgActivities >= 4 && avgActivities <= 6) {
        strengths.push('✅ Số lượng hoạt động mỗi ngày hợp lý (4-6)');
      } else {
        issues.push(`⚠️  Số lượng hoạt động không tối ưu (${avgActivities}/ngày)`);
      }
      
      // Check RAG
      if (itinerary.ragContext) {
        strengths.push('✅ Sử dụng dữ liệu từ database (RAG)');
      }
      
      // Check có location data không
      const hasLocationData = response.data.data.locations && response.data.data.locations.length > 0;
      if (hasLocationData) {
        strengths.push(`✅ Có ${response.data.data.locations.length} địa điểm với tọa độ & photos`);
      }
      
      console.log('\n💪 Điểm mạnh:');
      strengths.forEach(s => console.log(`   ${s}`));
      
      if (issues.length > 0) {
        console.log('\n⚠️  Cần cải thiện:');
        issues.forEach(i => console.log(`   ${i}`));
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('🎉 Test hoàn tất!');
      console.log('='.repeat(80));
      
    } else {
      console.log('❌ Không thể tạo lịch trình');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
};

testDalat2Days();

