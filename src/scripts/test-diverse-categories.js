/**
 * =================================================================
 * Script đơn giản để test thêm địa điểm đa dạng
 * =================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

// Test data for diverse places
const diversePlaces = [
  {
    name: 'Bảo tàng Lịch sử Việt Nam',
    description: 'Bảo tàng trưng bày các hiện vật lịch sử từ thời tiền sử đến hiện đại',
    category: 'bảo tàng',
    address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8322, 21.0245] // [lng, lat]
    },
    rating: 4.5,
    reviewCount: 1250,
    images: ['https://example.com/museum1.jpg'],
    contact: {
      phone: '024 3825 3518',
      website: 'https://baotanglichsu.vn'
    },
    openingHours: '8:00 - 17:00',
    tags: ['lịch sử', 'văn hóa', 'giáo dục'],
    priority: 8
  },
  {
    name: 'Chùa Một Cột',
    description: 'Ngôi chùa có kiến trúc độc đáo nhất Việt Nam, biểu tượng của Hà Nội',
    category: 'chùa',
    address: 'Chùa Một Cột, Đội Cấn, Ba Đình, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8322, 21.0356]
    },
    rating: 4.7,
    reviewCount: 2100,
    images: ['https://example.com/chua1.jpg'],
    contact: {
      phone: '024 3845 3518'
    },
    openingHours: '6:00 - 18:00',
    tags: ['tôn giáo', 'kiến trúc', 'lịch sử'],
    priority: 9
  },
  {
    name: 'Vịnh Hạ Long',
    description: 'Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi tuyệt đẹp',
    category: 'bãi biển',
    address: 'Vịnh Hạ Long, Quảng Ninh',
    location: {
      type: 'Point',
      coordinates: [107.1833, 20.9500]
    },
    rating: 4.8,
    reviewCount: 15000,
    images: ['https://example.com/halong1.jpg'],
    contact: {
      website: 'https://halongbay.com.vn'
    },
    openingHours: '24/7',
    tags: ['thiên nhiên', 'di sản', 'du thuyền'],
    priority: 10
  },
  {
    name: 'Sun World Ba Na Hills',
    description: 'Khu du lịch giải trí trên núi với cầu Vàng nổi tiếng thế giới',
    category: 'công viên giải trí',
    address: 'An Sơn, Hòa Vang, Đà Nẵng',
    location: {
      type: 'Point',
      coordinates: [108.0167, 15.9833]
    },
    rating: 4.4,
    reviewCount: 8500,
    images: ['https://example.com/sunworld1.jpg'],
    contact: {
      phone: '0236 3799 999',
      website: 'https://banahills.sunworld.vn'
    },
    openingHours: '7:00 - 22:00',
    tags: ['giải trí', 'cầu vàng', 'núi'],
    priority: 9
  },
  {
    name: 'Chợ Bến Thành',
    description: 'Chợ truyền thống nổi tiếng nhất Sài Gòn với 100 năm lịch sử',
    category: 'chợ',
    address: 'Lê Lợi, Quận 1, TP.HCM',
    location: {
      type: 'Point',
      coordinates: [106.6969, 10.7769]
    },
    rating: 4.2,
    reviewCount: 12000,
    images: ['https://example.com/ben-thanh1.jpg'],
    openingHours: '6:00 - 19:00',
    tags: ['mua sắm', 'ẩm thực', 'lịch sử'],
    priority: 8
  }
];

console.log('🎯 Danh sách địa điểm đa dạng:');
console.log('================================');

diversePlaces.forEach((place, index) => {
  console.log(`${index + 1}. ${place.name}`);
  console.log(`   📍 ${place.category} - ${place.address}`);
  console.log(`   ⭐ ${place.rating}/5 (${place.reviewCount} đánh giá)`);
  console.log(`   🏷️  ${place.tags.join(', ')}`);
  console.log('');
});

console.log('✅ Script test hoàn thành!');
console.log('💡 Các danh mục mới đã được thêm vào models:');
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
