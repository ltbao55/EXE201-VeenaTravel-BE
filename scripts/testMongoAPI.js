import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Place from '../src/models/Place.js';

dotenv.config();

async function testMongoAPI() {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log('✅ Connected to MongoDB for API testing');
        
        // Test 1: Get all places
        console.log('\n🔍 Test 1: Get all places');
        const allPlaces = await Place.find().limit(5);
        console.log('  Found', allPlaces.length, 'places (showing first 5)');
        allPlaces.forEach((place, idx) => {
            console.log(`    ${idx + 1}. ${place.name} (${place.category})`);
        });
        
        // Test 2: Search by category
        console.log('\n🔍 Test 2: Search by category (hotel)');
        const hotels = await Place.find({ category: 'hotel' });
        console.log('  Found', hotels.length, 'hotels');
        
        // Test 3: Search by tags
        console.log('\n🔍 Test 3: Search by tags (resort)');
        const resorts = await Place.find({ tags: { $in: ['resort'] } });
        console.log('  Found', resorts.length, 'resorts');
        resorts.slice(0, 3).forEach((place, idx) => {
            console.log(`    ${idx + 1}. ${place.name}`);
        });
        
        // Test 4: Text search
        console.log('\n🔍 Test 4: Text search (beach)');
        const beachPlaces = await Place.find(
            { $text: { $search: 'beach' } },
            { score: { $meta: 'textScore' } }
        ).sort({ score: { $meta: 'textScore' } }).limit(3);
        console.log('  Found', beachPlaces.length, 'places matching "beach"');
        beachPlaces.forEach((place, idx) => {
            console.log(`    ${idx + 1}. ${place.name}`);
        });
        
        // Test 5: Location-based query (near Vung Tau)
        console.log('\n🔍 Test 5: Location-based query (near Vũng Tàu center)');
        const nearbyPlaces = await Place.find({
            'location.lat': { $gte: 10.3, $lte: 10.4 },
            'location.lng': { $gte: 107.0, $lte: 107.1 }
        }).limit(5);
        console.log('  Found', nearbyPlaces.length, 'places near Vũng Tàu center');
        nearbyPlaces.forEach((place, idx) => {
            console.log(`    ${idx + 1}. ${place.name} (${place.location.lat.toFixed(3)}, ${place.location.lng.toFixed(3)})`);
        });
        
        // Test 6: Aggregation - count by category
        console.log('\n🔍 Test 6: Aggregation - count by category');
        const categoryStats = await Place.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        categoryStats.forEach(stat => {
            console.log(`    ${stat._id}: ${stat.count} places`);
        });
        
        console.log('\n🎉 All MongoDB tests passed successfully!');
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testMongoAPI();
