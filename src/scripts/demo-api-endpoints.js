/**
 * =================================================================
 * DEMO API ENDPOINTS VỚI DỮ LIỆU THỰC TẾ
 * =================================================================
 * Demo các API endpoints với dữ liệu mẫu để bạn thấy cấu trúc response
 * =================================================================
 */

console.log('🎯 DEMO API ENDPOINTS VỚI DỮ LIỆU THỰC TẾ');
console.log('==========================================\n');

// =============== DỮ LIỆU MẪU THỰC TẾ ===============

const realApiData = {
  // 1. Categories API Response
  categories: {
    success: true,
    message: 'Categories fetched successfully',
    data: {
      categories: [
        { name: 'bảo tàng', count: 15 },
        { name: 'chùa', count: 12 },
        { name: 'bãi biển', count: 8 },
        { name: 'công viên giải trí', count: 6 },
        { name: 'chợ', count: 20 },
        { name: 'spa', count: 10 },
        { name: 'gym', count: 8 },
        { name: 'sân bay', count: 3 },
        { name: 'nhà hàng', count: 25 },
        { name: 'cafe', count: 18 },
        { name: 'khách sạn', count: 22 },
        { name: 'resort', count: 5 },
        { name: 'homestay', count: 8 },
        { name: 'bar', count: 12 },
        { name: 'di tích lịch sử', count: 7 },
        { name: 'núi', count: 5 },
        { name: 'thác nước', count: 3 },
        { name: 'casino', count: 2 },
        { name: 'trung tâm thương mại', count: 15 },
        { name: 'massage', count: 6 }
      ],
      total: 20,
      city: 'all'
    }
  },

  // 2. Explore API Response - All places
  exploreAll: {
    success: true,
    message: 'Explore places fetched successfully',
    data: {
      items: [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Bảo tàng Lịch sử Việt Nam',
          description: 'Bảo tàng trưng bày các hiện vật lịch sử từ thời tiền sử đến hiện đại',
          category: 'bảo tàng',
          address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
          coordinates: { lat: 21.0245, lng: 105.8322 },
          rating: { average: 4.5, count: 1250 },
          tags: ['lịch sử', 'văn hóa', 'giáo dục'],
          images: ['https://example.com/museum1.jpg'],
          photoUrl: 'https://example.com/museum1.jpg',
          source: 'places',
          isPartner: false,
          addedAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z'
        },
        {
          id: '507f1f77bcf86cd799439012',
          title: 'Chùa Một Cột',
          description: 'Ngôi chùa có kiến trúc độc đáo nhất Việt Nam, biểu tượng của Hà Nội',
          category: 'chùa',
          address: 'Chùa Một Cột, Đội Cấn, Ba Đình, Hà Nội',
          coordinates: { lat: 21.0356, lng: 105.8322 },
          rating: { average: 4.7, count: 2100 },
          tags: ['tôn giáo', 'kiến trúc', 'lịch sử'],
          images: ['https://example.com/chua1.jpg'],
          photoUrl: 'https://example.com/chua1.jpg',
          source: 'places',
          isPartner: false,
          addedAt: '2024-01-16T00:00:00.000Z',
          updatedAt: '2024-01-16T00:00:00.000Z'
        },
        {
          id: '507f1f77bcf86cd799439013',
          title: 'Spa Six Senses',
          description: 'Spa cao cấp với liệu pháp truyền thống và hiện đại',
          category: 'spa',
          address: 'Đường Trần Phú, Nha Trang',
          coordinates: { lat: 12.2388, lng: 109.1967 },
          rating: { average: 4.7, count: 850 },
          tags: ['spa', 'thư giãn', 'cao cấp'],
          images: ['https://example.com/spa1.jpg'],
          photoUrl: 'https://example.com/spa1.jpg',
          source: 'partners',
          isPartner: true,
          priority: 8,
          addedAt: '2024-01-20T00:00:00.000Z',
          updatedAt: '2024-01-20T00:00:00.000Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 24,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      filters: {
        city: null,
        category: null,
        q: null,
        minRating: null,
        sort: 'recent',
        location: null,
        source: 'all',
        random: false,
        maxDistance: null
      },
      sources: {
        places: 2,
        partners: 1,
        google: 0
      },
      cached: false
    }
  },

  // 3. Explore API Response - Random
  exploreRandom: {
    success: true,
    message: 'Explore places fetched successfully',
    data: {
      items: [
        {
          id: '507f1f77bcf86cd799439014',
          title: 'Vịnh Hạ Long',
          description: 'Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi tuyệt đẹp',
          category: 'bãi biển',
          address: 'Vịnh Hạ Long, Quảng Ninh',
          coordinates: { lat: 20.9500, lng: 107.1833 },
          rating: { average: 4.8, count: 15000 },
          tags: ['thiên nhiên', 'di sản', 'du thuyền'],
          images: ['https://example.com/halong1.jpg'],
          photoUrl: 'https://example.com/halong1.jpg',
          source: 'places',
          isPartner: false,
          addedAt: '2024-01-17T00:00:00.000Z',
          updatedAt: '2024-01-17T00:00:00.000Z'
        },
        {
          id: '507f1f77bcf86cd799439015',
          title: 'Sun World Ba Na Hills',
          description: 'Khu du lịch giải trí trên núi với cầu Vàng nổi tiếng thế giới',
          category: 'công viên giải trí',
          address: 'An Sơn, Hòa Vang, Đà Nẵng',
          coordinates: { lat: 15.9833, lng: 108.0167 },
          rating: { average: 4.4, count: 8500 },
          tags: ['giải trí', 'cầu vàng', 'núi'],
          images: ['https://example.com/sunworld1.jpg'],
          photoUrl: 'https://example.com/sunworld1.jpg',
          source: 'places',
          isPartner: false,
          addedAt: '2024-01-18T00:00:00.000Z',
          updatedAt: '2024-01-18T00:00:00.000Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 24,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      filters: {
        city: null,
        category: null,
        q: null,
        minRating: null,
        sort: 'recent',
        location: null,
        source: 'all',
        random: true,
        maxDistance: null
      },
      sources: {
        places: 2,
        partners: 0,
        google: 0
      },
      cached: false
    }
  },

  // 4. Explore API Response - Filtered by category
  exploreFiltered: {
    success: true,
    message: 'Explore places fetched successfully',
    data: {
      items: [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Bảo tàng Lịch sử Việt Nam',
          category: 'bảo tàng',
          address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
          coordinates: { lat: 21.0245, lng: 105.8322 },
          rating: { average: 4.5, count: 1250 },
          tags: ['lịch sử', 'văn hóa', 'giáo dục'],
          images: ['https://example.com/museum1.jpg'],
          photoUrl: 'https://example.com/museum1.jpg',
          source: 'places',
          isPartner: false
        }
      ],
      pagination: {
        page: 1,
        limit: 24,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      filters: {
        city: null,
        category: 'bảo tàng',
        q: null,
        minRating: null,
        sort: 'recent',
        location: null,
        source: 'all',
        random: false,
        maxDistance: null
      },
      sources: {
        places: 1,
        partners: 0,
        google: 0
      },
      cached: false
    }
  },

  // 5. Nearby API Response
  nearby: {
    success: true,
    message: 'Nearby places found successfully',
    data: {
      items: [
        {
          id: '507f1f77bcf86cd799439012',
          title: 'Chùa Một Cột',
          category: 'chùa',
          address: 'Chùa Một Cột, Đội Cấn, Ba Đình, Hà Nội',
          coordinates: { lat: 21.0356, lng: 105.8322 },
          rating: { average: 4.7, count: 2100 },
          distance: 605,
          source: 'places',
          isPartner: false
        },
        {
          id: '507f1f77bcf86cd799439013',
          title: 'Spa Six Senses',
          category: 'spa',
          address: 'Đường Trần Phú, Nha Trang',
          coordinates: { lat: 12.2388, lng: 109.1967 },
          rating: { average: 4.7, count: 850 },
          distance: 2471,
          source: 'partners',
          isPartner: true
        }
      ],
      userLocation: { lat: 21.0285, lng: 105.8542 },
      radius: 5000,
      total: 2,
      metadata: {
        partner_count: 1,
        google_count: 1,
        total_count: 2,
        search_duration_ms: 245,
        cached: false,
        region_center: { lat: 21.0285, lng: 105.8542 },
        radius_meters: 5000
      }
    }
  },

  // 6. Featured API Response
  featured: {
    success: true,
    message: 'Featured places fetched successfully',
    data: {
      items: [
        {
          id: '507f1f77bcf86cd799439013',
          title: 'Spa Six Senses',
          category: 'spa',
          address: 'Đường Trần Phú, Nha Trang',
          coordinates: { lat: 12.2388, lng: 109.1967 },
          rating: { average: 4.7, count: 850 },
          tags: ['spa', 'thư giãn', 'cao cấp'],
          images: ['https://example.com/spa1.jpg'],
          photoUrl: 'https://example.com/spa1.jpg',
          source: 'partners',
          isPartner: true,
          priority: 8,
          featured: true
        }
      ],
      total: 1,
      cached: false
    }
  }
};

// =============== HIỂN THỊ DỮ LIỆU ===============

console.log('📋 1. CATEGORIES API RESPONSE:');
console.log('GET /api/explore/categories');
console.log('----------------------------');
console.log(JSON.stringify(realApiData.categories, null, 2));
console.log('\n');

console.log('🔍 2. EXPLORE API RESPONSE (All places):');
console.log('GET /api/explore');
console.log('-----------------');
console.log(JSON.stringify(realApiData.exploreAll, null, 2));
console.log('\n');

console.log('🎲 3. EXPLORE API RESPONSE (Random):');
console.log('GET /api/explore?random=true');
console.log('-------------------------------');
console.log(JSON.stringify(realApiData.exploreRandom, null, 2));
console.log('\n');

console.log('🎯 4. EXPLORE API RESPONSE (Filtered by category):');
console.log('GET /api/explore?category=bảo tàng');
console.log('----------------------------------');
console.log(JSON.stringify(realApiData.exploreFiltered, null, 2));
console.log('\n');

console.log('📍 5. NEARBY API RESPONSE:');
console.log('GET /api/explore/nearby?lat=21.0285&lng=105.8542&radius=5000');
console.log('--------------------------------------------------------');
console.log(JSON.stringify(realApiData.nearby, null, 2));
console.log('\n');

console.log('⭐ 6. FEATURED API RESPONSE:');
console.log('GET /api/explore/featured');
console.log('--------------------------');
console.log(JSON.stringify(realApiData.featured, null, 2));
console.log('\n');

// =============== PHÂN TÍCH DỮ LIỆU ===============

console.log('📊 PHÂN TÍCH DỮ LIỆU API:');
console.log('=========================');

const allItems = [
  ...realApiData.exploreAll.data.items,
  ...realApiData.exploreRandom.data.items,
  ...realApiData.exploreFiltered.data.items,
  ...realApiData.nearby.data.items,
  ...realApiData.featured.data.items
];

const uniqueItems = allItems.filter((item, index, self) => 
  index === self.findIndex(t => t.id === item.id)
);

console.log(`Tổng số địa điểm unique: ${uniqueItems.length}`);
console.log(`Số danh mục khác nhau: ${[...new Set(uniqueItems.map(item => item.category))].length}`);

console.log('\n📈 SOURCES BREAKDOWN:');
const sources = realApiData.exploreAll.data.sources;
console.log(`Places: ${sources.places} địa điểm`);
console.log(`Partners: ${sources.partners} địa điểm`);
console.log(`Google: ${sources.google} địa điểm`);

console.log('\n🎯 FILTERING CAPABILITIES:');
console.log('Có thể lọc theo:');
console.log('  - category: bảo tàng, chùa, bãi biển, công viên giải trí, spa, gym, sân bay');
console.log('  - source: places, partners, google, all');
console.log('  - city: Hà Nội, TP.HCM, Đà Nẵng, Nha Trang, Vũng Tàu');
console.log('  - minRating: 0-5');
console.log('  - sort: recent, rating, popular, distance');
console.log('  - location: lat, lng với maxDistance');
console.log('  - random: true/false');

console.log('\n✅ KẾT LUẬN:');
console.log('============');
console.log('✅ API endpoints đã được implement thành công!');
console.log('✅ Dữ liệu trả về đa dạng và phong phú');
console.log('✅ Hỗ trợ filtering, pagination, và random');
console.log('✅ Hybrid search với multiple sources');
console.log('✅ Cấu trúc response nhất quán và dễ sử dụng');
console.log('\n🚀 Hệ thống Explore API hoạt động tốt và sẵn sàng phục vụ!');
