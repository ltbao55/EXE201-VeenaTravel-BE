import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import embeddingService from '../src/services/embeddingService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script để tạo Pinecone index và đẩy dữ liệu từ vt_data_chuan.json lên Pinecone
 */
class PineconeSeeder {
    constructor() {
        this.apiKey = process.env.PINECONE_API_KEY;
        this.indexName = 'veena-travel-places';
        this.dimension = 768; // Google embedding-001 dimension
        
        if (!this.apiKey) {
            throw new Error('PINECONE_API_KEY is required in environment variables');
        }

        this.pinecone = new Pinecone({
            apiKey: this.apiKey
        });
    }

    /**
     * Tạo Pinecone index nếu chưa tồn tại
     */
    async createIndexIfNotExists() {
        try {
            console.log('🔍 Checking if index exists...');
            
            // Kiểm tra xem index đã tồn tại chưa
            const indexList = await this.pinecone.listIndexes();
            const existingIndex = indexList.indexes?.find(idx => idx.name === this.indexName);
            
            if (existingIndex) {
                console.log(`✅ Index '${this.indexName}' already exists`);
                return;
            }

            console.log(`🚀 Creating index '${this.indexName}'...`);
            
            await this.pinecone.createIndex({
                name: this.indexName,
                dimension: this.dimension,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });

            console.log(`✅ Index '${this.indexName}' created successfully`);
            
            // Đợi index sẵn sàng
            console.log('⏳ Waiting for index to be ready...');
            await this.waitForIndexReady();
            
        } catch (error) {
            console.error('❌ Error creating index:', error.message);
            throw error;
        }
    }

    /**
     * Đợi index sẵn sàng
     */
    async waitForIndexReady() {
        const maxAttempts = 30;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const indexDescription = await this.pinecone.describeIndex(this.indexName);
                if (indexDescription.status?.ready) {
                    console.log('✅ Index is ready');
                    return;
                }
                
                console.log(`⏳ Index not ready yet, waiting... (${attempts + 1}/${maxAttempts})`);
                await this.delay(2000); // Đợi 2 giây
                attempts++;
                
            } catch (error) {
                console.log(`⏳ Waiting for index... (${attempts + 1}/${maxAttempts})`);
                await this.delay(2000);
                attempts++;
            }
        }
        
        throw new Error('Index did not become ready within expected time');
    }

    /**
     * Đọc dữ liệu từ file vt_data_chuan.json
     */
    loadData() {
        try {
            console.log('📖 Loading data from vt_data_chuan.json...');
            
            const dataPath = path.join(process.cwd(), 'vt_data_chuan.json');
            const rawData = fs.readFileSync(dataPath, 'utf8');
            const data = JSON.parse(rawData);
            
            if (!data.features || !Array.isArray(data.features)) {
                throw new Error('Invalid data format: expected GeoJSON with features array');
            }
            
            console.log(`✅ Loaded ${data.features.length} places from data file`);
            return data.features;
            
        } catch (error) {
            console.error('❌ Error loading data:', error.message);
            throw error;
        }
    }

    /**
     * Tạo text mô tả cho embedding từ place data
     */
    createPlaceText(place) {
        const props = place.properties;
        const parts = [];
        
        if (props.name) parts.push(props.name);
        if (props.description) parts.push(props.description);
        if (props.tags && Array.isArray(props.tags)) {
            parts.push(props.tags.join(', '));
        }
        if (props.address) parts.push(props.address);
        
        return parts.join(' ');
    }

    /**
     * Tạo metadata cho place
     */
    createPlaceMetadata(place) {
        const props = place.properties;
        const coords = place.geometry?.coordinates;
        
        const metadata = {
            name: props.name || '',
            address: props.address || '',
            tags: props.tags || []
        };
        
        if (coords && coords.length >= 2) {
            metadata.longitude = coords[0];
            metadata.latitude = coords[1];
        }
        
        // Thêm destination từ address nếu có
        if (props.address) {
            const addressParts = props.address.split(',');
            if (addressParts.length > 1) {
                metadata.destination = addressParts[addressParts.length - 2]?.trim() || '';
            }
        }
        
        return metadata;
    }

    /**
     * Upload dữ liệu lên Pinecone theo batch
     */
    async uploadData(places) {
        try {
            console.log('🚀 Starting data upload to Pinecone...');
            
            const index = this.pinecone.index(this.indexName);
            const batchSize = 10; // Upload 10 places mỗi lần
            const totalBatches = Math.ceil(places.length / batchSize);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < totalBatches; i++) {
                const startIdx = i * batchSize;
                const endIdx = Math.min(startIdx + batchSize, places.length);
                const batch = places.slice(startIdx, endIdx);
                
                console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${startIdx + 1}-${endIdx})`);
                
                try {
                    const vectors = [];
                    
                    for (const place of batch) {
                        try {
                            const placeText = this.createPlaceText(place);
                            const metadata = this.createPlaceMetadata(place);
                            
                            // Tạo embedding
                            const embedding = await embeddingService.createEmbedding(placeText);
                            
                            // Tạo unique ID
                            const placeId = `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            
                            vectors.push({
                                id: placeId,
                                values: embedding,
                                metadata: metadata
                            });
                            
                            console.log(`  ✅ Processed: ${metadata.name}`);
                            
                            // Delay nhỏ để tránh rate limit
                            await this.delay(200);
                            
                        } catch (error) {
                            console.error(`  ❌ Error processing place: ${error.message}`);
                            errorCount++;
                        }
                    }
                    
                    // Upload batch lên Pinecone
                    if (vectors.length > 0) {
                        await index.upsert(vectors);
                        successCount += vectors.length;
                        console.log(`  ✅ Uploaded batch ${i + 1} (${vectors.length} vectors)`);
                    }
                    
                    // Delay giữa các batch
                    await this.delay(1000);
                    
                } catch (error) {
                    console.error(`❌ Error uploading batch ${i + 1}:`, error.message);
                    errorCount += batch.length;
                }
            }
            
            console.log('\n📊 Upload Summary:');
            console.log(`✅ Successfully uploaded: ${successCount} places`);
            console.log(`❌ Failed: ${errorCount} places`);
            console.log(`📈 Success rate: ${((successCount / places.length) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('❌ Error in upload process:', error.message);
            throw error;
        }
    }

    /**
     * Kiểm tra kết quả upload
     */
    async verifyUpload() {
        try {
            console.log('🔍 Verifying upload...');
            
            const index = this.pinecone.index(this.indexName);
            const stats = await index.describeIndexStats();
            
            console.log('📊 Index Statistics:');
            console.log(`  Total vectors: ${stats.totalVectorCount || 0}`);
            console.log(`  Index fullness: ${((stats.indexFullness || 0) * 100).toFixed(2)}%`);
            
            if (stats.namespaces) {
                console.log('  Namespaces:', Object.keys(stats.namespaces));
            }
            
        } catch (error) {
            console.error('❌ Error verifying upload:', error.message);
        }
    }

    /**
     * Utility function để tạo delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Chạy toàn bộ quá trình seeding
     */
    async run() {
        try {
            console.log('🚀 Starting Pinecone seeding process...\n');
            
            // 1. Tạo index nếu cần
            await this.createIndexIfNotExists();
            
            // 2. Load dữ liệu
            const places = this.loadData();
            
            // Kiểm tra embedding service trước
            console.log('🔍 Testing embedding service...');
            const embeddingTest = await embeddingService.testConnection();
            if (!embeddingTest) {
                console.log('⚠️  Embedding service not available, but continuing with index creation...');
            }

            if (embeddingTest) {
                // 3. Upload dữ liệu nếu embedding service hoạt động
                await this.uploadData(places);

                // 4. Verify kết quả
                await this.verifyUpload();

                console.log('\n🎉 Pinecone seeding completed successfully!');
            } else {
                console.log('\n⚠️  Index created but data upload skipped due to embedding service issues.');
                console.log('Please check your EMBEDDING_API_KEY and Google AI API quota.');
            }

        } catch (error) {
            console.error('\n💥 Seeding failed:', error.message);
            if (error.message.includes('quota') || error.message.includes('429')) {
                console.log('\n💡 Suggestion: Check your Google AI API quota and billing settings.');
            }
            process.exit(1);
        }
    }
}

// Chạy script nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    const seeder = new PineconeSeeder();
    seeder.run();
}

export default PineconeSeeder;
