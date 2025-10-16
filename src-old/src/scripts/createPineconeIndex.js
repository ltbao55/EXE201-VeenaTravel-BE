import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const createNewIndex = async () => {
  try {
    console.log('🔧 Tạo Pinecone index mới với dimension 768...');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    // Tạo index mới
    const indexName = 'vinatravel-768';
    
    console.log(`📝 Tạo index: ${indexName}`);
    
    await pinecone.createIndex({
      name: indexName,
      dimension: 768, // Phù hợp với Google Gemini embedding
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('✅ Tạo index thành công!');
    console.log(`📋 Cập nhật pinecone-service.js để sử dụng index: ${indexName}`);
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Index đã tồn tại');
    } else {
      console.error('❌ Lỗi tạo index:', error.message);
    }
  }
};

createNewIndex();
