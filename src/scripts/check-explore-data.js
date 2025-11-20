/**
 * =================================================================
 * Script test trực tiếp dữ liệu Explore từ database
 * =================================================================
 */

import mongoose from 'mongoose';
import PartnerPlace from '../models/PartnerPlace.js';
import Place from '../models/Place.js';
import dotenv from 'dotenv';

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

const testExploreData = async () => {
  try {
    console.log('🔍 TESTING EXPLORE DATA FROM DATABASE');
    console.log('=====================================\n');

    // 1. Test Partner Places với danh mục mới
    console.log('📊 PARTNER PLACES:');
    console.log('==================');
    
    const partnerStats = await PartnerPlace.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Danh mục Partner Places:');
    partnerStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} địa điểm`);
    });

    // 2. Test Places với danh mục mới
    console.log('\n📊 PLACES:');
    console.log('===========');
    
    const placeStats = await Place.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Danh mục Places:');
    placeStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} địa điểm`);
    });

    // 3. Test các danh mục mới cụ thể
    console.log('\n🎯 TEST CÁC DANH MỤC MỚI:');
    console.log('===========================');

    const newCategories = ['bảo tàng', 'chùa', 'bãi biển', 'công viên giải trí', 'chợ', 'spa', 'gym', 'sân bay'];
    
    for (const category of newCategories) {
      const partnerCount = await PartnerPlace.countDocuments({ category });
      const placeCount = await Place.countDocuments({ category });
      
      console.log(`${category}:`);
      console.log(`  Partner Places: ${partnerCount}`);
      console.log(`  Places: ${placeCount}`);
      console.log(`  Total: ${partnerCount + placeCount}`);
      console.log('');
    }

    // 4. Test một số địa điểm cụ thể
    console.log('📍 SAMPLE DATA:');
    console.log('================');
    
    const samplePlaces = await PartnerPlace.find({ 
      category: { $in: ['bảo tàng', 'chùa', 'bãi biển', 'spa', 'gym', 'chợ'] }
    }).limit(10).lean();

    if (samplePlaces.length > 0) {
      samplePlaces.forEach((place, index) => {
        console.log(`${index + 1}. ${place.name}`);
        console.log(`   📍 ${place.category} - ${place.address}`);
        console.log(`   ⭐ ${place.rating}/5 (${place.reviewCount} đánh giá)`);
        console.log(`   🏷️  ${place.tags?.join(', ') || 'N/A'}`);
        console.log(`   📊 Priority: ${place.priority}`);
        console.log(`   🔄 Status: ${place.status}`);
        console.log('');
      });
    } else {
      console.log('❌ Không tìm thấy địa điểm nào với danh mục mới');
      console.log('💡 Có thể cần thêm dữ liệu mẫu');
    }

    // 5. Test Places collection
    console.log('🏢 PLACES COLLECTION SAMPLE:');
    console.log('============================');
    
    const samplePlacesCollection = await Place.find({}).limit(5).lean();
    
    if (samplePlacesCollection.length > 0) {
      samplePlacesCollection.forEach((place, index) => {
        console.log(`${index + 1}. ${place.name}`);
        console.log(`   📍 ${place.category} - ${place.address}`);
        console.log(`   ⭐ ${place.rating?.average || 0}/5 (${place.rating?.count || 0} đánh giá)`);
        console.log(`   🏷️  ${place.tags?.join(', ') || 'N/A'}`);
        console.log(`   🔄 Active: ${place.isActive}`);
        console.log('');
      });
    } else {
      console.log('❌ Không có dữ liệu trong Places collection');
    }

    // 6. Test Google Maps mapping
    console.log('🗺️  GOOGLE MAPS MAPPING:');
    console.log('========================');
    
    const categoryMapping = {
      'bảo tàng': 'museum',
      'chùa': 'place_of_worship',
      'bãi biển': 'natural_feature',
      'công viên giải trí': 'amusement_park',
      'chợ': 'shopping_mall',
      'spa': 'spa',
      'gym': 'gym',
      'sân bay': 'airport'
    };

    Object.entries(categoryMapping).forEach(([vietnamese, google]) => {
      console.log(`  ${vietnamese} → ${google}`);
    });

    console.log('\n✅ Test hoàn thành!');
    console.log('💡 Hệ thống Explore đã được mở rộng thành công với nhiều danh mục mới.');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

const main = async () => {
  try {
    await connectDB();
    await testExploreData();
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Đã ngắt kết nối MongoDB');
    process.exit(0);
  }
};

main();
