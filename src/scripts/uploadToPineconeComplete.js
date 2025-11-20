import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pineconeService from '../services/pinecone-service.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Kiểm tra kết nối và cấu hình
 */
const checkConfiguration = async () => {
  console.log('🔧 Kiểm tra cấu hình...');
  
  const requiredEnvVars = ['PINECONE_API_KEY', 'GEMINIAPIKEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missingVars.join(', ')}`);
  }
  
  console.log('✅ Cấu hình API keys đã sẵn sàng');
  
  // Test kết nối Pinecone
  try {
    const testResult = await pineconeService.semanticSearch('test connection', { limit: 1 });
    if (testResult.success) {
      console.log('✅ Kết nối Pinecone thành công');
    } else {
      console.warn('⚠️ Cảnh báo kết nối Pinecone:', testResult.message);
    }
  } catch (error) {
    console.warn('⚠️ Không thể test kết nối Pinecone:', error.message);
  }
};

/**
 * Đọc và validate dữ liệu từ file
 */
const loadAndValidateData = (dataPath) => {
  console.log('📂 Đang đọc file dữ liệu...');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`File dữ liệu không tồn tại: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const geoData = JSON.parse(rawData);
  
  if (!geoData.features || !Array.isArray(geoData.features)) {
    throw new Error('Định dạng dữ liệu không hợp lệ: thiếu features array');
  }
  
  console.log(`📊 Tìm thấy ${geoData.features.length} địa điểm trong file dữ liệu`);
  return geoData;
};

/**
 * Chuẩn bị dữ liệu cho Pinecone với error handling
 */
const prepareDataForPinecone = (geoData) => {
  console.log('🔄 Đang chuẩn bị dữ liệu cho Pinecone...');
  
  const pineconeData = [];
  const errors = [];
  
  for (let i = 0; i < geoData.features.length; i++) {
    try {
      const feature = geoData.features[i];
      const { properties, geometry } = feature;
      
      // Validate required fields
      if (!properties?.name) {
        errors.push(`Địa điểm ${i}: thiếu tên`);
        continue;
      }
      
      // Tạo ID duy nhất cho mỗi địa điểm
      const placeId = `place_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Chuẩn bị metadata với validation
      const metadata = {
        name: properties.name,
        address: properties.address || 'Không có địa chỉ',
        description: properties.description || properties.name,
        category: properties.tags?.[0] || 'unknown',
        tags: Array.isArray(properties.tags) ? properties.tags.join(', ') : '',
        rating: typeof properties.rating === 'number' ? properties.rating : 0,
        priceRange: properties.priceRange || 'unknown',
        coordinates: Array.isArray(geometry?.coordinates) ? geometry.coordinates : [0, 0],
        source: 'vt_data_chuan',
        uploadedAt: new Date().toISOString()
      };
      
      pineconeData.push({
        id: placeId,
        name: properties.name,
        description: properties.description || properties.name,
        metadata: metadata
      });
      
      // Log progress mỗi 50 items
      if ((i + 1) % 50 === 0) {
        console.log(`📝 Đã chuẩn bị ${i + 1}/${geoData.features.length} địa điểm`);
      }
      
    } catch (error) {
      errors.push(`Địa điểm ${i}: ${error.message}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn(`⚠️ Có ${errors.length} lỗi khi chuẩn bị dữ liệu:`);
    errors.slice(0, 5).forEach(error => console.warn(`   - ${error}`));
    if (errors.length > 5) {
      console.warn(`   ... và ${errors.length - 5} lỗi khác`);
    }
  }
  
  console.log(`✅ Đã chuẩn bị ${pineconeData.length} địa điểm cho upload`);
  return { pineconeData, errors };
};

/**
 * Upload dữ liệu lên Pinecone với progress tracking và error handling
 */
const uploadWithProgressTracking = async (pineconeData) => {
  console.log('🚀 Bắt đầu upload dữ liệu lên Pinecone...');
  
  const batchSize = 10; // Giảm batch size để tránh timeout
  let totalUploaded = 0;
  let totalErrors = 0;
  const uploadErrors = [];
  
  const totalBatches = Math.ceil(pineconeData.length / batchSize);
  
  for (let i = 0; i < pineconeData.length; i += batchSize) {
    const batch = pineconeData.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`🔄 Đang xử lý batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);
    
    try {
      const result = await pineconeService.batchUpsertPlaces(batch);
      
      if (result.success) {
        const processed = result.processed || batch.length;
        totalUploaded += processed;
        console.log(`✅ Batch ${batchNumber}: Upload thành công ${processed} địa điểm`);
      } else {
        totalErrors += batch.length;
        const errorMsg = `Batch ${batchNumber} thất bại: ${result.message}`;
        uploadErrors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
      
      // Progress bar đơn giản
      const progress = Math.round((batchNumber / totalBatches) * 100);
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      console.log(`📊 Tiến độ: [${progressBar}] ${progress}%`);
      
      // Delay giữa các batch để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      totalErrors += batch.length;
      const errorMsg = `Batch ${batchNumber} lỗi: ${error.message}`;
      uploadErrors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      
      // Retry logic cho batch bị lỗi
      if (error.message.includes('rate limit') || error.message.includes('timeout')) {
        console.log(`🔄 Thử lại batch ${batchNumber} sau 3 giây...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const retryResult = await pineconeService.batchUpsertPlaces(batch);
          if (retryResult.success) {
            totalUploaded += retryResult.processed || batch.length;
            totalErrors -= batch.length;
            console.log(`✅ Batch ${batchNumber} retry thành công`);
          }
        } catch (retryError) {
          console.error(`❌ Batch ${batchNumber} retry vẫn thất bại:`, retryError.message);
        }
      }
    }
  }
  
  return {
    totalUploaded,
    totalErrors,
    uploadErrors,
    totalProcessed: pineconeData.length
  };
};

/**
 * Test semantic search sau khi upload để verify
 */
const testSemanticSearch = async () => {
  try {
    console.log('🧪 Đang test semantic search để verify upload...');
    
    const testQueries = [
      'khách sạn gần biển',
      'nhà hàng hải sản ngon',
      'điểm tham quan lịch sử',
      'resort cao cấp',
      'quán cà phê view đẹp'
    ];
    
    let successfulQueries = 0;
    
    for (const query of testQueries) {
      console.log(`\n🔎 Test query: "${query}"`);
      
      try {
        const result = await pineconeService.semanticSearch(query, { limit: 3 });
        
        if (result.success && result.data.results.length > 0) {
          successfulQueries++;
          console.log(`✅ Tìm thấy ${result.data.results.length} kết quả:`);
          result.data.results.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.metadata.name} (score: ${item.score.toFixed(3)})`);
          });
        } else {
          console.log(`⚠️ Không tìm thấy kết quả: ${result.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`❌ Lỗi test query "${query}":`, error.message);
      }
      
      // Delay giữa các query
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Kết quả test: ${successfulQueries}/${testQueries.length} queries thành công`);
    
    if (successfulQueries > 0) {
      console.log('✅ Semantic search hoạt động bình thường - Upload đã thành công!');
    } else {
      console.warn('⚠️ Semantic search không hoạt động - Có thể cần kiểm tra lại dữ liệu');
    }
    
  } catch (error) {
    console.error('❌ Lỗi test semantic search:', error);
  }
};

/**
 * Upload dữ liệu địa điểm lên Pinecone Vector Database
 */
const uploadToPinecone = async () => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Bắt đầu quá trình upload dữ liệu lên Pinecone Vector Database...');
    console.log('='.repeat(60));
    
    // 1. Kiểm tra cấu hình
    await checkConfiguration();
    
    // 2. Đọc và validate dữ liệu
    const dataPath = path.join(__dirname, '../../vt_data_chuan.json');
    const geoData = loadAndValidateData(dataPath);
    
    // 3. Chuẩn bị dữ liệu
    const { pineconeData, errors: prepareErrors } = prepareDataForPinecone(geoData);
    
    if (pineconeData.length === 0) {
      throw new Error('Không có dữ liệu hợp lệ để upload');
    }
    
    // 4. Upload dữ liệu
    const uploadResult = await uploadWithProgressTracking(pineconeData);
    
    // 5. Báo cáo kết quả
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 HOÀN THÀNH UPLOAD DỮ LIỆU!');
    console.log('='.repeat(60));
    console.log(`📊 Tổng kết:`);
    console.log(`   - Tổng địa điểm xử lý: ${uploadResult.totalProcessed}`);
    console.log(`   - Upload thành công: ${uploadResult.totalUploaded}`);
    console.log(`   - Lỗi upload: ${uploadResult.totalErrors}`);
    console.log(`   - Lỗi chuẩn bị dữ liệu: ${prepareErrors.length}`);
    console.log(`   - Thời gian thực hiện: ${duration} giây`);
    console.log(`   - Tỷ lệ thành công: ${Math.round((uploadResult.totalUploaded / uploadResult.totalProcessed) * 100)}%`);
    
    if (uploadResult.uploadErrors.length > 0) {
      console.log('\n❌ Chi tiết lỗi upload:');
      uploadResult.uploadErrors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      if (uploadResult.uploadErrors.length > 5) {
        console.log(`   ... và ${uploadResult.uploadErrors.length - 5} lỗi khác`);
      }
    }
    
    // 6. Test semantic search để verify
    if (uploadResult.totalUploaded > 0) {
      console.log('\n🔍 Đang test semantic search để verify upload...');
      await testSemanticSearch();
    }
    
    return {
      success: uploadResult.totalUploaded > 0,
      totalUploaded: uploadResult.totalUploaded,
      totalErrors: uploadResult.totalErrors,
      duration
    };
    
  } catch (error) {
    console.error('\n❌ LỖI NGHIÊM TRỌNG TRONG QUÁ TRÌNH UPLOAD:');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  }
};

// Chạy script
if (import.meta.url === `file://${process.argv[1]}`) {
  uploadToPinecone()
    .then((result) => {
      if (result.success) {
        console.log('✅ Script hoàn thành thành công!');
        process.exit(0);
      } else {
        console.log('⚠️ Script hoàn thành nhưng có lỗi');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Script thất bại:', error.message);
      process.exit(1);
    });
}

export default uploadToPinecone;
