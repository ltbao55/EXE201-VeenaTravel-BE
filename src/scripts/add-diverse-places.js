/**
 * =================================================================
 * Script để thêm địa điểm đa dạng cho hệ thống Explore
 * =================================================================
 * Thêm các địa điểm thuộc nhiều danh mục khác nhau để làm phong phú
 * dữ liệu explore, không chỉ giới hạn ở khách sạn và cafe
 * =================================================================
 */

import mongoose from 'mongoose';
import PartnerPlace from '../models/PartnerPlace.js';
import Place from '../models/Place.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// =============== DIVERSE PLACES DATA ===============

const diversePlaces = [
  // 🎯 Điểm tham quan
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

  // 🏖️ Du lịch tự nhiên
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
    name: 'Thác Bản Giốc',
    description: 'Thác nước tự nhiên lớn nhất Đông Nam Á, biên giới Việt-Trung',
    category: 'thác nước',
    address: 'Trùng Khánh, Cao Bằng',
    location: {
      type: 'Point',
      coordinates: [106.6667, 22.6667]
    },
    rating: 4.6,
    reviewCount: 3200,
    images: ['https://example.com/thac1.jpg'],
    openingHours: '6:00 - 18:00',
    tags: ['thiên nhiên', 'thác nước', 'biên giới'],
    priority: 8
  },

  // 🎪 Giải trí
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
    name: 'VinWonders Phú Quốc',
    description: 'Công viên giải trí hiện đại với các trò chơi cảm giác mạnh',
    category: 'khu vui chơi',
    address: 'Bãi Trường, Phú Quốc, Kiên Giang',
    location: {
      type: 'Point',
      coordinates: [103.9667, 10.2833]
    },
    rating: 4.3,
    reviewCount: 4200,
    images: ['https://example.com/vinwonders1.jpg'],
    contact: {
      phone: '0297 399 0000',
      website: 'https://vinwonders.com'
    },
    openingHours: '9:00 - 22:00',
    tags: ['giải trí', 'cảm giác mạnh', 'gia đình'],
    priority: 7
  },

  // 🛍️ Mua sắm
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
  },

  {
    name: 'Vincom Center',
    description: 'Trung tâm thương mại hiện đại với nhiều thương hiệu quốc tế',
    category: 'trung tâm thương mại',
    address: '72 Lê Thánh Tôn, Quận 1, TP.HCM',
    location: {
      type: 'Point',
      coordinates: [106.7000, 10.7778]
    },
    rating: 4.1,
    reviewCount: 3500,
    images: ['https://example.com/vincom1.jpg'],
    contact: {
      phone: '028 3822 9999',
      website: 'https://vincom.com.vn'
    },
    openingHours: '9:30 - 22:00',
    tags: ['mua sắm', 'thương hiệu', 'hiện đại'],
    priority: 6
  },

  // 🏥 Dịch vụ
  {
    name: 'Spa Six Senses',
    description: 'Spa cao cấp với liệu pháp truyền thống và hiện đại',
    category: 'spa',
    address: 'Đường Trần Phú, Nha Trang',
    location: {
      type: 'Point',
      coordinates: [109.1833, 12.2500]
    },
    rating: 4.7,
    reviewCount: 850,
    images: ['https://example.com/spa1.jpg'],
    contact: {
      phone: '0258 3520 000',
      website: 'https://sixsenses.com'
    },
    openingHours: '9:00 - 21:00',
    tags: ['spa', 'thư giãn', 'cao cấp'],
    priority: 7
  },

  {
    name: 'California Fitness & Yoga',
    description: 'Phòng tập gym hiện đại với đầy đủ trang thiết bị',
    category: 'gym',
    address: '45 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
    location: {
      type: 'Point',
      coordinates: [106.7000, 10.7778]
    },
    rating: 4.3,
    reviewCount: 1200,
    images: ['https://example.com/gym1.jpg'],
    contact: {
      phone: '028 3822 8888',
      website: 'https://californiafitness.com'
    },
    openingHours: '5:00 - 23:00',
    tags: ['gym', 'yoga', 'fitness'],
    priority: 5
  },

  // 🚗 Giao thông
  {
    name: 'Sân bay Tân Sơn Nhất',
    description: 'Sân bay quốc tế lớn nhất Việt Nam, cửa ngõ vào TP.HCM',
    category: 'sân bay',
    address: 'Tân Bình, TP.HCM',
    location: {
      type: 'Point',
      coordinates: [106.6500, 10.8189]
    },
    rating: 4.0,
    reviewCount: 25000,
    images: ['https://example.com/airport1.jpg'],
    contact: {
      phone: '028 3848 5383',
      website: 'https://sgn.airport.vn'
    },
    openingHours: '24/7',
    tags: ['giao thông', 'quốc tế', 'cửa ngõ'],
    priority: 9
  },

  // 🎓 Giáo dục & Văn hóa
  {
    name: 'Thư viện Quốc gia Việt Nam',
    description: 'Thư viện lớn nhất Việt Nam với hàng triệu đầu sách',
    category: 'thư viện',
    address: '31 Tràng Thi, Hoàn Kiếm, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8333, 21.0222]
    },
    rating: 4.4,
    reviewCount: 1800,
    images: ['https://example.com/library1.jpg'],
    contact: {
      phone: '024 3825 3518',
      website: 'https://nlv.gov.vn'
    },
    openingHours: '8:00 - 20:00',
    tags: ['giáo dục', 'sách', 'nghiên cứu'],
    priority: 6
  },

  {
    name: 'Nhà hát Lớn Hà Nội',
    description: 'Nhà hát opera cổ kính với kiến trúc Pháp đẹp mắt',
    category: 'theater',
    address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8333, 21.0222]
    },
    rating: 4.5,
    reviewCount: 2100,
    images: ['https://example.com/theater1.jpg'],
    contact: {
      phone: '024 3933 0113',
      website: 'https://hanoioperahouse.org.vn'
    },
    openingHours: '9:00 - 17:00',
    tags: ['nghệ thuật', 'opera', 'kiến trúc'],
    priority: 7
  }
];

// =============== ADD PLACES TO DATABASE ===============

const addDiversePlaces = async () => {
  try {
    console.log('🚀 Bắt đầu thêm địa điểm đa dạng...');

    // Clear existing diverse places (optional)
    // await PartnerPlace.deleteMany({ category: { $in: ['bảo tàng', 'chùa', 'bãi biển', 'thác nước', 'công viên giải trí', 'khu vui chơi', 'chợ', 'trung tâm thương mại', 'spa', 'gym', 'sân bay', 'thư viện', 'theater'] } });
    // console.log('🧹 Đã xóa dữ liệu cũ');

    let addedCount = 0;
    let skippedCount = 0;

    for (const placeData of diversePlaces) {
      try {
        // Check if place already exists
        const existingPlace = await PartnerPlace.findOne({ 
          name: placeData.name,
          address: placeData.address 
        });

        if (existingPlace) {
          console.log(`⏭️  Bỏ qua: ${placeData.name} (đã tồn tại)`);
          skippedCount++;
          continue;
        }

        // Create new place
        const newPlace = new PartnerPlace({
          ...placeData,
          status: 'active',
          syncStatus: 'pending'
        });

        await newPlace.save();
        console.log(`✅ Đã thêm: ${placeData.name} (${placeData.category})`);
        addedCount++;

      } catch (error) {
        console.error(`❌ Lỗi khi thêm ${placeData.name}:`, error.message);
      }
    }

    console.log('\n📊 Kết quả:');
    console.log(`✅ Đã thêm: ${addedCount} địa điểm`);
    console.log(`⏭️  Bỏ qua: ${skippedCount} địa điểm`);
    console.log(`📝 Tổng cộng: ${diversePlaces.length} địa điểm trong danh sách`);

    // Show category distribution
    const categoryStats = await PartnerPlace.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📈 Phân bố danh mục:');
    categoryStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} địa điểm`);
    });

  } catch (error) {
    console.error('❌ Lỗi khi thêm địa điểm:', error);
  }
};

// =============== MAIN EXECUTION ===============

const main = async () => {
  try {
    await connectDB();
    await addDiversePlaces();
    
    console.log('\n🎉 Hoàn thành! Hệ thống explore giờ đã đa dạng hơn.');
    console.log('💡 Bạn có thể test bằng cách gọi API explore với các category mới.');
    
  } catch (error) {
    console.error('❌ Lỗi chính:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Đã ngắt kết nối MongoDB');
    process.exit(0);
  }
};

// Run the script
main();
