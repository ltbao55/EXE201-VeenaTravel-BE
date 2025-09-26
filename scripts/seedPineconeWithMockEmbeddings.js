import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script để đẩy dữ liệu lên Pinecone với mock embeddings
 * Sử dụng khi Google AI API không khả dụng
 */
class PineconeMockSeeder {
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
     * Tạo mock embedding vector với dimension 768
     */
    createMockEmbedding(text) {
        // Tạo vector ngẫu nhiên nhưng có tính nhất quán dựa trên text
        const hash = this.simpleHash(text);
        const vector = [];
        
        for (let i = 0; i < this.dimension; i++) {
            // Sử dụng hash để tạo số ngẫu nhiên nhất quán
            const seed = (hash + i) * 9301 + 49297;
            const random = (seed % 233280) / 233280.0;
            vector.push((random - 0.5) * 2); // Normalize to [-1, 1]
        }
        
        // Normalize vector để có magnitude = 1
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / magnitude);
    }

    /**
     * Tạo hash đơn giản từ string
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
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
        
        // Thêm category nếu có trong tags
        if (props.tags && Array.isArray(props.tags) && props.tags.length > 0) {
            metadata.category = props.tags[0]; // Lấy tag đầu tiên làm category
        }
        
        return metadata;
    }

    /**
     * Upload dữ liệu lên Pinecone theo batch
     */
    async uploadData(places) {
        try {
            console.log('🚀 Starting data upload to Pinecone with mock embeddings...');
            
            const index = this.pinecone.index(this.indexName);
            const batchSize = 10; // Upload 10 places mỗi lần
            const totalBatches = Math.ceil(places.length / batchSize);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < totalBatches; i++) {
                const startIdx = i * batchSize;
                const endIdx = Math.min(startIdx + batchSize, places.length);
                const batch = places.slice(startIdx, endIdx);
                
                console.log(`[object Object]ng batch ${i + 1}/${totalBatches} (${startIdx + 1}-${endIdx})`);
                
                try {
                    const vectors = [];
                    
                    for (const place of batch) {
                        try {
                            const placeText = this.createPlaceText(place);
                            const metadata = this.createPlaceMetadata(place);
                            
                            // Tạo mock embedding
                            const embedding = this.createMockEmbedding(placeText);
                            
                            // Tạo unique ID từ place properties
                            const placeId = this.generatePlaceId(place);
                            
                            vectors.push({
                                id: placeId,
                                values: embedding,
                                metadata: metadata
                            });
                            
                            console.log(`  ✅ Processed: ${metadata.name}`);
                            
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
                    
                    // Delay giữa các batch để tránh rate limit
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
     * Tạo ID duy nhất cho place
     */
    generatePlaceId(place) {
        const props = place.properties;
        const coords = place.geometry?.coordinates;
        
        // Tạo ID từ name và coordinates
        let idParts = [];
        if (props.name) {
            idParts.push(props.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
        }
        if (coords && coords.length >= 2) {
            idParts.push(`${coords[0].toFixed(4)}_${coords[1].toFixed(4)}`);
        }
        
        if (idParts.length === 0) {
            idParts.push(`place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        }
        
        return idParts.join('_');
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
            console.log(`  Dimension: ${stats.dimension || 'N/A'}`);
            
            if (stats.namespaces) {
                console.log('  Namespaces:', Object.keys(stats.namespaces));
            }
            
            // Test query để kiểm tra dữ liệu
            if (stats.totalVectorCount > 0) {
                console.log('\n🔍 Testing query functionality...');
                const testVector = this.createMockEmbedding('test query');
                const queryResult = await index.query({
                    vector: testVector,
                    topK: 3,
                    includeMetadata: true
                });
                
                console.log(`✅ Query test successful, found ${queryResult.matches?.length || 0} matches`);
                if (queryResult.matches && queryResult.matches.length > 0) {
                    console.log('Sample results:');
                    queryResult.matches.slice(0, 2).forEach((match, idx) => {
                        console.log(`  ${idx + 1}. ${match.metadata?.name || match.id} (score: ${match.score?.toFixed(3)})`);
                    });
                }
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
            console.log('🚀 Starting Pinecone seeding with mock embeddings...\n');
            
            // 1. Load dữ liệu
            const places = this.loadData();
            
            // 2. Upload dữ liệu với mock embeddings
            await this.uploadData(places);
            
            // 3. Verify kết quả
            await this.verifyUpload();
            
            console.log('\n🎉 Pinecone seeding completed successfully!');
            console.log('📝 Note: Using mock embeddings for testing purposes.');
            console.log('💡 Replace with real embeddings when Google AI API is available.');
            
        } catch (error) {
            console.error('\n💥 Seeding failed:', error.message);
            process.exit(1);
        }
    }
}

// Chạy script nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    const seeder = new PineconeMockSeeder();
    seeder.run();
}

export default PineconeMockSeeder;
