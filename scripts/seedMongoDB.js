import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Place from '../src/models/Place.js';

dotenv.config();

/**
 * Script để seed dữ liệu từ vt_data_chuan.json vào MongoDB
 */
class MongoDBSeeder {
    constructor() {
        this.mongoUri = process.env.MONGODB_CONNECTIONSTRING;
        
        if (!this.mongoUri) {
            throw new Error('MONGODB_CONNECTIONSTRING is required in environment variables');
        }
    }

    /**
     * Kết nối MongoDB
     */
    async connect() {
        try {
            await mongoose.connect(this.mongoUri);
            console.log('✅ Connected to MongoDB successfully');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Ngắt kết nối MongoDB
     */
    async disconnect() {
        try {
            await mongoose.disconnect();
            console.log('✅ Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error.message);
        }
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
     * Chuyển đổi GeoJSON feature thành Place document
     */
    transformToPlace(feature) {
        const props = feature.properties;
        const coords = feature.geometry?.coordinates;
        
        if (!coords || coords.length < 2) {
            throw new Error('Invalid coordinates in feature');
        }
        
        // Tạo place object theo schema
        const place = {
            name: props.name || 'Unnamed Place',
            address: props.address || '',
            description: props.description || '',
            tags: Array.isArray(props.tags) ? props.tags : [],
            location: {
                lng: coords[0], // longitude
                lat: coords[1]  // latitude
            }
        };
        
        // Thêm category từ tags nếu có
        if (place.tags.length > 0) {
            const firstTag = place.tags[0].toLowerCase();
            const categoryMap = {
                'hotel': 'hotel',
                'resort': 'hotel',
                'restaurant': 'restaurant',
                'food': 'restaurant',
                'beach': 'nature',
                'park': 'nature',
                'mountain': 'nature',
                'temple': 'cultural',
                'museum': 'cultural',
                'market': 'shopping',
                'shopping': 'shopping',
                'entertainment': 'entertainment',
                'attraction': 'attraction',
                'historical': 'historical'
            };
            
            // Tìm category phù hợp
            for (const [key, category] of Object.entries(categoryMap)) {
                if (firstTag.includes(key)) {
                    place.category = category;
                    break;
                }
            }
        }
        
        // Set default category nếu chưa có
        if (!place.category) {
            place.category = 'attraction';
        }
        
        return place;
    }

    /**
     * Xóa dữ liệu cũ trong collection places
     */
    async clearExistingData() {
        try {
            console.log('🗑️  Clearing existing places data...');
            const result = await Place.deleteMany({});
            console.log(`✅ Deleted ${result.deletedCount} existing places`);
        } catch (error) {
            console.error('❌ Error clearing existing data:', error.message);
            throw error;
        }
    }

    /**
     * Seed dữ liệu vào MongoDB
     */
    async seedData(features) {
        try {
            console.log('🚀 Starting MongoDB seeding process...');
            
            const places = [];
            let successCount = 0;
            let errorCount = 0;
            
            // Transform từng feature thành place
            for (let i = 0; i < features.length; i++) {
                try {
                    const feature = features[i];
                    const place = this.transformToPlace(feature);
                    places.push(place);
                    successCount++;
                    
                    console.log(`  ✅ Processed: ${place.name}`);
                    
                } catch (error) {
                    console.error(`  ❌ Error processing feature ${i + 1}:`, error.message);
                    errorCount++;
                }
            }
            
            // Insert tất cả places vào MongoDB
            if (places.length > 0) {
                console.log(`\n📤 Inserting ${places.length} places into MongoDB...`);
                
                const insertResult = await Place.insertMany(places, { 
                    ordered: false // Continue inserting even if some fail
                });
                
                console.log(`✅ Successfully inserted ${insertResult.length} places`);
            }
            
            console.log('\n📊 Seeding Summary:');
            console.log(`✅ Successfully processed: ${successCount} places`);
            console.log(`❌ Failed to process: ${errorCount} places`);
            console.log(`📈 Success rate: ${((successCount / features.length) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('❌ Error in seeding process:', error.message);
            throw error;
        }
    }

    /**
     * Verify dữ liệu sau khi seed
     */
    async verifyData() {
        try {
            console.log('\n🔍 Verifying seeded data...');
            
            const totalCount = await Place.countDocuments();
            console.log(`📊 Total places in database: ${totalCount}`);
            
            if (totalCount > 0) {
                // Lấy sample places
                const samplePlaces = await Place.find().limit(3);
                console.log('\n📍 Sample places:');
                
                samplePlaces.forEach((place, idx) => {
                    console.log(`  ${idx + 1}. ${place.name}`);
                    console.log(`     Address: ${place.address}`);
                    console.log(`     Category: ${place.category}`);
                    console.log(`     Tags: ${place.tags.join(', ')}`);
                    console.log(`     Location: ${place.location.lat}, ${place.location.lng}`);
                    console.log('');
                });
                
                // Thống kê theo category
                const categoryStats = await Place.aggregate([
                    { $group: { _id: '$category', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]);
                
                console.log('📈 Places by category:');
                categoryStats.forEach(stat => {
                    console.log(`  ${stat._id}: ${stat.count} places`);
                });
                
                // Test text search
                console.log('\n🔍 Testing text search...');
                const searchResult = await Place.find(
                    { $text: { $search: 'beach hotel' } },
                    { score: { $meta: 'textScore' } }
                ).sort({ score: { $meta: 'textScore' } }).limit(3);
                
                console.log(`Found ${searchResult.length} places matching 'beach hotel':`);
                searchResult.forEach((place, idx) => {
                    console.log(`  ${idx + 1}. ${place.name} (score: ${place.score?.toFixed(2)})`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error verifying data:', error.message);
        }
    }

    /**
     * Chạy toàn bộ quá trình seeding
     */
    async run() {
        try {
            console.log('🚀 Starting MongoDB seeding process...\n');
            
            // 1. Kết nối MongoDB
            await this.connect();
            
            // 2. Load dữ liệu
            const features = this.loadData();
            
            // 3. Xóa dữ liệu cũ
            await this.clearExistingData();
            
            // 4. Seed dữ liệu mới
            await this.seedData(features);
            
            // 5. Verify kết quả
            await this.verifyData();
            
            console.log('\n🎉 MongoDB seeding completed successfully!');
            
        } catch (error) {
            console.error('\n💥 Seeding failed:', error.message);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// Chạy script nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    const seeder = new MongoDBSeeder();
    seeder.run();
}

export default MongoDBSeeder;
