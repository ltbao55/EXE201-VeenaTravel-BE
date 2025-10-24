/**
 * =================================================================
 * DEMO TÍNH NĂNG RANDOM TRONG EXPLORE API
 * =================================================================
 * Demo cách hoạt động của parameter random=true trong Explore API
 * =================================================================
 */

console.log('🎲 DEMO TÍNH NĂNG RANDOM TRONG EXPLORE API');
console.log('==========================================\n');

// =============== GIẢI THÍCH TÍNH NĂNG RANDOM ===============

console.log('📋 TÍNH NĂNG RANDOM:');
console.log('===================');
console.log('✅ Có hỗ trợ random sampling trong Explore API');
console.log('✅ Parameter: ?random=true');
console.log('✅ Chỉ áp dụng cho Places collection (MongoDB)');
console.log('❌ Không áp dụng cho Partner Places');
console.log('❌ Không áp dụng cho Google Maps results');
console.log('');

// =============== CÁCH HOẠT ĐỘNG ===============

console.log('🔧 CÁCH HOẠT ĐỘNG:');
console.log('===================');
console.log('1. Khi random=true:');
console.log('   - Sử dụng MongoDB aggregation pipeline');
console.log('   - $sample: { size: limit } để lấy ngẫu nhiên');
console.log('   - Không áp dụng sorting');
console.log('   - Không áp dụng pagination (skip)');
console.log('');
console.log('2. Khi random=false (mặc định):');
console.log('   - Sử dụng MongoDB find() query');
console.log('   - Áp dụng sorting theo sort parameter');
console.log('   - Áp dụng pagination với skip/limit');
console.log('');

// =============== CODE IMPLEMENTATION ===============

console.log('💻 CODE IMPLEMENTATION:');
console.log('=======================');
console.log('```javascript');
console.log('// Trong exploreController.js');
console.log('const random = String(req.query.random || "false").toLowerCase() === "true";');
console.log('');
console.log('if (random) {');
console.log('  const pipeline = [];');
console.log('  if (q) pipeline.push({ $match: { $text: { $search: q }, ...filter } });');
console.log('  else pipeline.push({ $match: filter });');
console.log('  pipeline.push({ $sample: { size: limit } });');
console.log('  items = await Place.aggregate(pipeline);');
console.log('  total = await Place.countDocuments(filter);');
console.log('} else {');
console.log('  // Normal query with sorting and pagination');
console.log('  const query = Place.find(filter);');
console.log('  query.sort({ updatedAt: -1 });');
console.log('  items = await query.skip(skip).limit(limit).lean();');
console.log('}');
console.log('```');
console.log('');

// =============== DEMO API CALLS ===============

console.log('🎯 DEMO API CALLS:');
console.log('==================');
console.log('');

console.log('1️⃣  EXPLORE API - Random Places:');
console.log('GET /api/explore?random=true');
console.log('-------------------------------');
const randomResponse = {
  success: true,
  message: 'Explore places fetched successfully',
  data: {
    items: [
      {
        id: '1',
        title: 'Bảo tàng Lịch sử Việt Nam',
        category: 'bảo tàng',
        address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
        rating: { average: 4.5, count: 1250 },
        source: 'places',
        isPartner: false
      },
      {
        id: '2',
        title: 'Chùa Một Cột',
        category: 'chùa',
        address: 'Chùa Một Cột, Đội Cấn, Ba Đình, Hà Nội',
        rating: { average: 4.7, count: 2100 },
        source: 'places',
        isPartner: false
      },
      {
        id: '3',
        title: 'Vịnh Hạ Long',
        category: 'bãi biển',
        address: 'Vịnh Hạ Long, Quảng Ninh',
        rating: { average: 4.8, count: 15000 },
        source: 'places',
        isPartner: false
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
      random: true,
      maxDistance: null
    },
    sources: {
      places: 3,
      partners: 0,
      google: 0
    },
    cached: false
  }
};
console.log(JSON.stringify(randomResponse, null, 2));
console.log('\n');

console.log('2️⃣  EXPLORE API - Random với Category:');
console.log('GET /api/explore?category=bảo tàng&random=true');
console.log('-----------------------------------------------');
const randomCategoryResponse = {
  success: true,
  message: 'Explore places fetched successfully',
  data: {
    items: [
      {
        id: '1',
        title: 'Bảo tàng Lịch sử Việt Nam',
        category: 'bảo tàng',
        address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
        rating: { average: 4.5, count: 1250 },
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
      random: true,
      maxDistance: null
    },
    sources: {
      places: 1,
      partners: 0,
      google: 0
    },
    cached: false
  }
};
console.log(JSON.stringify(randomCategoryResponse, null, 2));
console.log('\n');

console.log('3️⃣  EXPLORE API - Random với Search:');
console.log('GET /api/explore?q=chùa&random=true');
console.log('------------------------------------');
const randomSearchResponse = {
  success: true,
  message: 'Explore places fetched successfully',
  data: {
    items: [
      {
        id: '2',
        title: 'Chùa Một Cột',
        category: 'chùa',
        address: 'Chùa Một Cột, Đội Cấn, Ba Đình, Hà Nội',
        rating: { average: 4.7, count: 2100 },
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
      category: null,
      q: 'chùa',
      minRating: null,
      sort: 'recent',
      location: null,
      source: 'all',
      random: true,
      maxDistance: null
    },
    sources: {
      places: 1,
      partners: 0,
      google: 0
    },
    cached: false
  }
};
console.log(JSON.stringify(randomSearchResponse, null, 2));
console.log('\n');

// =============== SO SÁNH RANDOM VS NORMAL ===============

console.log('📊 SO SÁNH RANDOM VS NORMAL:');
console.log('=============================');
console.log('');

const comparison = {
  'Tính năng': {
    'Random': 'Có',
    'Normal': 'Có'
  },
  'Sorting': {
    'Random': 'Không áp dụng',
    'Normal': 'Áp dụng theo sort parameter'
  },
  'Pagination': {
    'Random': 'Không áp dụng skip',
    'Normal': 'Áp dụng skip/limit'
  },
  'MongoDB Query': {
    'Random': 'aggregate() với $sample',
    'Normal': 'find() với sort/skip/limit'
  },
  'Performance': {
    'Random': 'Nhanh hơn (không sort)',
    'Normal': 'Chậm hơn (có sort)'
  },
  'Consistency': {
    'Random': 'Khác nhau mỗi lần',
    'Normal': 'Nhất quán'
  },
  'Use Case': {
    'Random': 'Khám phá ngẫu nhiên',
    'Normal': 'Tìm kiếm có mục đích'
  }
};

Object.entries(comparison).forEach(([metric, data]) => {
  console.log(`${metric}:`);
  console.log(`  Random: ${data.Random}`);
  console.log(`  Normal: ${data.Normal}`);
  console.log('');
});

// =============== LIMITATIONS ===============

console.log('⚠️  LIMITATIONS:');
console.log('================');
console.log('❌ Random chỉ áp dụng cho Places collection');
console.log('❌ Partner Places luôn được sắp xếp theo priority');
console.log('❌ Google Maps results không có random');
console.log('❌ Không thể kết hợp random với sorting');
console.log('❌ Không thể kết hợp random với pagination');
console.log('');

// =============== RECOMMENDATIONS ===============

console.log('💡 RECOMMENDATIONS:');
console.log('===================');
console.log('✅ Sử dụng random=true cho:');
console.log('   - Khám phá ngẫu nhiên địa điểm');
console.log('   - Tạo surprise element cho user');
console.log('   - Test data diversity');
console.log('');
console.log('✅ Sử dụng random=false cho:');
console.log('   - Tìm kiếm có mục đích');
console.log('   - Cần sorting theo rating/popularity');
console.log('   - Cần pagination');
console.log('');

console.log('🎯 TEST CASES:');
console.log('==============');
console.log('GET /api/explore?random=true');
console.log('GET /api/explore?category=spa&random=true');
console.log('GET /api/explore?q=nhà hàng&random=true');
console.log('GET /api/explore?city=Hà Nội&random=true');
console.log('GET /api/explore?minRating=4&random=true');
console.log('');

console.log('✅ KẾT LUẬN:');
console.log('============');
console.log('✅ Tính năng random đã được implement thành công!');
console.log('✅ Sử dụng MongoDB $sample aggregation');
console.log('✅ Chỉ áp dụng cho Places collection');
console.log('✅ Hỗ trợ filtering (category, city, q, minRating)');
console.log('✅ Không áp dụng sorting và pagination');
console.log('✅ Phù hợp cho khám phá ngẫu nhiên địa điểm');
console.log('\n🎲 Người dùng có thể khám phá địa điểm một cách ngẫu nhiên!');
