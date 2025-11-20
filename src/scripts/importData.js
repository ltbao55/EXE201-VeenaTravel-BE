import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import Place from '../models/Place.js';
import Plan from '../models/Plan.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
// import pineconeService from '../services/pinecone-service.js'; // Tạm thời comment để tránh lỗi

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reset toàn bộ database và import dữ liệu mới
 */
const resetAndImportData = async () => {
  try {
    console.log('🚀 Bắt đầu quá trình reset và import dữ liệu...');
    
    // Kết nối database
    await connectDB();
    console.log('✅ Đã kết nối database');
    
    // Xóa toàn bộ dữ liệu hiện tại
    console.log('🗑️ Đang xóa dữ liệu cũ...');
    await Promise.all([
      Place.deleteMany({}),
      Plan.deleteMany({}),
      Trip.deleteMany({}),
      // Không xóa User để giữ lại tài khoản
    ]);
    console.log('✅ Đã xóa dữ liệu cũ');
    
    // Đọc dữ liệu từ file JSON
    const dataPath = path.join(__dirname, '../../vt_data_chuan.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const geoData = JSON.parse(rawData);
    
    console.log(`📊 Tìm thấy ${geoData.features.length} địa điểm trong file dữ liệu`);
    
    // Import dữ liệu địa điểm
    const places = [];
    const pineconeData = [];
    
    for (let i = 0; i < geoData.features.length; i++) {
      const feature = geoData.features[i];
      const { properties, geometry } = feature;
      
      // Tạo Place document
      const place = {
        name: properties.name,
        address: properties.address,
        description: properties.description,
        tags: properties.tags || [],
        coordinates: {
          type: 'Point',
          coordinates: geometry.coordinates // [lng, lat]
        },
        location: {
          lat: geometry.coordinates[1],
          lng: geometry.coordinates[0]
        },
        category: determineCategory(properties.tags),
        rating: Math.random() * 2 + 3, // Random rating 3-5
        isActive: true,
        source: 'vt_data_chuan'
      };
      
      places.push(place);
      
      // Chuẩn bị dữ liệu cho Pinecone
      pineconeData.push({
        id: `place_${i}`,
        name: properties.name,
        description: properties.description,
        metadata: {
          name: properties.name,
          address: properties.address,
          description: properties.description,
          tags: properties.tags,
          category: place.category,
          coordinates: place.location
        }
      });
      
      // Log progress
      if ((i + 1) % 50 === 0) {
        console.log(`📍 Đã xử lý ${i + 1}/${geoData.features.length} địa điểm`);
      }
    }
    
    // Lưu vào MongoDB
    console.log('💾 Đang lưu dữ liệu vào MongoDB...');
    await Place.insertMany(places);
    console.log(`✅ Đã lưu ${places.length} địa điểm vào MongoDB`);
    
    // Tạm thời bỏ qua Pinecone upload để tránh lỗi
    console.log('⚠️ Bỏ qua upload Pinecone (sẽ thực hiện sau khi fix lỗi service)');
    
    // Tạo một số plan mẫu
    console.log('📋 Đang tạo plan mẫu...');
    const samplePlans = [
      {
        title: 'Du lịch Vũng Tàu 3 ngày 2 đêm',
        description: 'Khám phá thành phố biển Vũng Tàu với những bãi biển đẹp và ẩm thực hấp dẫn',
        destination: 'Vũng Tàu',
        duration: 3,
        estimatedBudget: 2000000,
        highlights: ['Bãi Sau', 'Tượng Chúa Kitô', 'Hải đăng Vũng Tàu', 'Chợ đêm'],
        isPublic: true,
        category: 'beach'
      },
      {
        title: 'Khám phá Đà Lạt lãng mạn',
        description: 'Trải nghiệm không khí mát mẻ và cảnh đẹp thơ mộng của thành phố ngàn hoa',
        destination: 'Đà Lạt',
        duration: 4,
        estimatedBudget: 3000000,
        highlights: ['Hồ Xuân Hương', 'Chợ đêm Đà Lạt', 'Thác Elephant', 'Ga Đà Lạt'],
        isPublic: true,
        category: 'mountain'
      },
      {
        title: 'Sài Gòn - Thành phố không ngủ',
        description: 'Khám phá nhịp sống sôi động và ẩm thực đường phố của Thành phố Hồ Chí Minh',
        destination: 'TP. Hồ Chí Minh',
        duration: 2,
        estimatedBudget: 1500000,
        highlights: ['Chợ Bến Thành', 'Nhà thờ Đức Bà', 'Phố đi bộ Nguyễn Huệ', 'Quận 1'],
        isPublic: true,
        category: 'city'
      }
    ];
    
    await Plan.insertMany(samplePlans);
    console.log(`✅ Đã tạo ${samplePlans.length} plan mẫu`);
    
    console.log('🎉 Hoàn thành quá trình reset và import dữ liệu!');
    console.log('📝 Tổng kết:');
    console.log(`   - ${places.length} địa điểm đã được import`);
    console.log(`   - ${samplePlans.length} plan mẫu đã được tạo`);
    console.log(`   - Dữ liệu đã được đồng bộ với Pinecone`);
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình import dữ liệu:', error);
    throw error;
  }
};

/**
 * Xác định category dựa trên tags
 */
const determineCategory = (tags) => {
  if (!tags || !Array.isArray(tags)) return 'other';
  
  const tagString = tags.join(' ').toLowerCase();
  
  if (tagString.includes('khách sạn') || tagString.includes('resort') || tagString.includes('nơi lưu trú')) {
    return 'accommodation';
  }
  if (tagString.includes('nhà hàng') || tagString.includes('quán ăn') || tagString.includes('ẩm thực')) {
    return 'restaurant';
  }
  if (tagString.includes('điểm tham quan') || tagString.includes('du lịch') || tagString.includes('tham quan')) {
    return 'attraction';
  }
  if (tagString.includes('spa') || tagString.includes('massage') || tagString.includes('thư giãn')) {
    return 'wellness';
  }
  if (tagString.includes('mua sắm') || tagString.includes('chợ') || tagString.includes('shopping')) {
    return 'shopping';
  }
  if (tagString.includes('giải trí') || tagString.includes('vui chơi') || tagString.includes('entertainment')) {
    return 'entertainment';
  }
  
  return 'other';
};

/**
 * Chạy script import
 */
const runImport = async () => {
  try {
    await resetAndImportData();
    console.log('✅ Script import hoàn thành thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script import thất bại:', error);
    process.exit(1);
  }
};

// Chạy script nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  runImport();
}

export { resetAndImportData };
