/**
 * =================================================================
 * API Test để kiểm tra các danh mục mới trong Explore
 * =================================================================
 */

import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

// Mock data for testing
const mockPlaces = [
  {
    id: '1',
    name: 'Bảo tàng Lịch sử Việt Nam',
    category: 'bảo tàng',
    address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    rating: { average: 4.5, count: 1250 },
    images: ['https://example.com/museum1.jpg'],
    source: 'places',
    isPartner: false
  },
  {
    id: '2',
    name: 'Chùa Một Cột',
    category: 'chùa',
    address: 'Chùa Một Cột, Đội Cấn, Ba Đình, Hà Nội',
    rating: { average: 4.7, count: 2100 },
    images: ['https://example.com/chua1.jpg'],
    source: 'places',
    isPartner: false
  },
  {
    id: '3',
    name: 'Vịnh Hạ Long',
    category: 'bãi biển',
    address: 'Vịnh Hạ Long, Quảng Ninh',
    rating: { average: 4.8, count: 15000 },
    images: ['https://example.com/halong1.jpg'],
    source: 'places',
    isPartner: false
  },
  {
    id: '4',
    name: 'Sun World Ba Na Hills',
    category: 'công viên giải trí',
    address: 'An Sơn, Hòa Vang, Đà Nẵng',
    rating: { average: 4.4, count: 8500 },
    images: ['https://example.com/sunworld1.jpg'],
    source: 'places',
    isPartner: false
  },
  {
    id: '5',
    name: 'Chợ Bến Thành',
    category: 'chợ',
    address: 'Lê Lợi, Quận 1, TP.HCM',
    rating: { average: 4.2, count: 12000 },
    images: ['https://example.com/ben-thanh1.jpg'],
    source: 'places',
    isPartner: false
  },
  {
    id: '6',
    name: 'Spa Six Senses',
    category: 'spa',
    address: 'Đường Trần Phú, Nha Trang',
    rating: { average: 4.7, count: 850 },
    images: ['https://example.com/spa1.jpg'],
    source: 'partners',
    isPartner: true
  },
  {
    id: '7',
    name: 'California Fitness & Yoga',
    category: 'gym',
    address: '45 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
    rating: { average: 4.3, count: 1200 },
    images: ['https://example.com/gym1.jpg'],
    source: 'partners',
    isPartner: true
  },
  {
    id: '8',
    name: 'Sân bay Tân Sơn Nhất',
    category: 'sân bay',
    address: 'Tân Bình, TP.HCM',
    rating: { average: 4.0, count: 25000 },
    images: ['https://example.com/airport1.jpg'],
    source: 'places',
    isPartner: false
  }
];

// Available categories
const availableCategories = [
  // 🏨 Lưu trú
  'khách sạn', 'resort', 'homestay', 'hostel', 'villa', 'apartment',
  
  // 🍽️ Ẩm thực
  'nhà hàng', 'quán ăn', 'cafe', 'bar', 'pub', 'bistro', 'food court', 'street food',
  
  // 🎯 Điểm tham quan
  'điểm tham quan', 'di tích lịch sử', 'bảo tàng', 'chùa', 'nhà thờ', 'công viên', 'vườn thú',
  
  // 🏖️ Du lịch tự nhiên
  'bãi biển', 'núi', 'thác nước', 'hồ', 'sông', 'đảo', 'hang động', 'rừng',
  
  // 🎪 Giải trí
  'khu vui chơi', 'công viên giải trí', 'casino', 'club', 'karaoke', 'cinema', 'theater',
  
  // 🛍️ Mua sắm
  'trung tâm thương mại', 'chợ', 'cửa hàng', 'siêu thị', 'outlet', 'night market',
  
  // 🏥 Dịch vụ
  'spa', 'massage', 'salon', 'gym', 'yoga', 'bệnh viện', 'phòng khám', 'ngân hàng',
  
  // 🚗 Giao thông
  'sân bay', 'bến xe', 'ga tàu', 'bến cảng', 'trạm xăng', 'bãi đỗ xe',
  
  // 🎓 Giáo dục & Văn hóa
  'trường học', 'thư viện', 'trung tâm văn hóa', 'phòng triển lãm', 'studio',
  
  // 🏢 Công sở
  'văn phòng', 'công ty', 'nhà máy', 'khu công nghiệp', 'co-working space',
  
  // 🏠 Khác
  'other'
];

// GET /api/test-explore - Test explore với các danh mục mới
app.get('/api/test-explore', (req, res) => {
  const { category, source = 'all', limit = 10 } = req.query;
  
  let filteredPlaces = mockPlaces;
  
  // Filter by category
  if (category) {
    filteredPlaces = filteredPlaces.filter(place => 
      place.category === category
    );
  }
  
  // Filter by source
  if (source !== 'all') {
    filteredPlaces = filteredPlaces.filter(place => 
      place.source === source
    );
  }
  
  // Limit results
  const limitedPlaces = filteredPlaces.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    message: 'Test explore với danh mục đa dạng',
    data: {
      items: limitedPlaces,
      total: filteredPlaces.length,
      filters: {
        category: category || null,
        source: source,
        limit: parseInt(limit)
      },
      availableCategories: availableCategories
    }
  });
});

// GET /api/test-categories - Lấy danh sách tất cả danh mục
app.get('/api/test-categories', (req, res) => {
  const categoryGroups = {
    '🏨 Lưu trú': ['khách sạn', 'resort', 'homestay', 'hostel', 'villa', 'apartment'],
    '🍽️ Ẩm thực': ['nhà hàng', 'quán ăn', 'cafe', 'bar', 'pub', 'bistro', 'food court', 'street food'],
    '🎯 Điểm tham quan': ['điểm tham quan', 'di tích lịch sử', 'bảo tàng', 'chùa', 'nhà thờ', 'công viên', 'vườn thú'],
    '🏖️ Du lịch tự nhiên': ['bãi biển', 'núi', 'thác nước', 'hồ', 'sông', 'đảo', 'hang động', 'rừng'],
    '🎪 Giải trí': ['khu vui chơi', 'công viên giải trí', 'casino', 'club', 'karaoke', 'cinema', 'theater'],
    '🛍️ Mua sắm': ['trung tâm thương mại', 'chợ', 'cửa hàng', 'siêu thị', 'outlet', 'night market'],
    '🏥 Dịch vụ': ['spa', 'massage', 'salon', 'gym', 'yoga', 'bệnh viện', 'phòng khám', 'ngân hàng'],
    '🚗 Giao thông': ['sân bay', 'bến xe', 'ga tàu', 'bến cảng', 'trạm xăng', 'bãi đỗ xe'],
    '🎓 Giáo dục & Văn hóa': ['trường học', 'thư viện', 'trung tâm văn hóa', 'phòng triển lãm', 'studio'],
    '🏢 Công sở': ['văn phòng', 'công ty', 'nhà máy', 'khu công nghiệp', 'co-working space'],
    '🏠 Khác': ['other']
  };
  
  res.json({
    success: true,
    message: 'Danh sách tất cả danh mục địa điểm',
    data: {
      categoryGroups,
      totalCategories: availableCategories.length,
      totalGroups: Object.keys(categoryGroups).length
    }
  });
});

// GET /api/test-category/:category - Test một danh mục cụ thể
app.get('/api/test-category/:category', (req, res) => {
  const { category } = req.params;
  
  const placesInCategory = mockPlaces.filter(place => 
    place.category === category
  );
  
  if (placesInCategory.length === 0) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy địa điểm nào trong danh mục "${category}"`,
      data: {
        category,
        suggestions: availableCategories.filter(cat => 
          cat.toLowerCase().includes(category.toLowerCase()) || 
          category.toLowerCase().includes(cat.toLowerCase())
        )
      }
    });
  }
  
  res.json({
    success: true,
    message: `Địa điểm trong danh mục "${category}"`,
    data: {
      category,
      items: placesInCategory,
      total: placesInCategory.length
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Test server đang chạy trên port ${PORT}`);
  console.log('📋 Các endpoint có sẵn:');
  console.log(`   GET http://localhost:${PORT}/api/test-explore`);
  console.log(`   GET http://localhost:${PORT}/api/test-explore?category=bảo tàng`);
  console.log(`   GET http://localhost:${PORT}/api/test-explore?category=spa&source=partners`);
  console.log(`   GET http://localhost:${PORT}/api/test-categories`);
  console.log(`   GET http://localhost:${PORT}/api/test-category/bảo tàng`);
  console.log('');
  console.log('💡 Test các danh mục mới:');
  console.log('   - bảo tàng, chùa, bãi biển, công viên giải trí');
  console.log('   - chợ, spa, gym, sân bay');
  console.log('   - và nhiều danh mục khác...');
});
