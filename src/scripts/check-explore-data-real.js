/**
 * =================================================================
 * Script kiểm tra dữ liệu Explore từ database
 * =================================================================
 */

import { connectDB } from '../config/db.js';
import PartnerPlace from '../models/PartnerPlace.js';
import Place from '../models/Place.js';

const testExploreData = async () => {
  try {
    console.log('🔍 CHECKING EXPLORE DATA FROM DATABASE');
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

    // 4. Test một số địa điểm cụ thể từ Partner Places
    console.log('📍 PARTNER PLACES SAMPLE:');
    console.log('===========================');
    
    const samplePartnerPlaces = await PartnerPlace.find({}).limit(10).lean();

    if (samplePartnerPlaces.length > 0) {
      samplePartnerPlaces.forEach((place, index) => {
        console.log(`${index + 1}. ${place.name}`);
        console.log(`   📍 ${place.category} - ${place.address}`);
        console.log(`   ⭐ ${place.rating}/5 (${place.reviewCount} đánh giá)`);
        console.log(`   🏷️  ${place.tags?.join(', ') || 'N/A'}`);
        console.log(`   📊 Priority: ${place.priority}`);
        console.log(`   🔄 Status: ${place.status}`);
        console.log(`   📅 Created: ${place.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ Không có dữ liệu trong Partner Places collection');
    }

    // 5. Test Places collection
    console.log('🏢 PLACES COLLECTION SAMPLE:');
    console.log('============================');
    
    const samplePlacesCollection = await Place.find({}).limit(10).lean();
    
    if (samplePlacesCollection.length > 0) {
      samplePlacesCollection.forEach((place, index) => {
        console.log(`${index + 1}. ${place.name}`);
        console.log(`   📍 ${place.category} - ${place.address}`);
        console.log(`   ⭐ ${place.rating?.average || 0}/5 (${place.rating?.count || 0} đánh giá)`);
        console.log(`   🏷️  ${place.tags?.join(', ') || 'N/A'}`);
        console.log(`   🔄 Active: ${place.isActive}`);
        console.log(`   📅 Created: ${place.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ Không có dữ liệu trong Places collection');
    }

    // 6. Test tổng số lượng
    console.log('📈 TỔNG KẾT:');
    console.log('============');
    const totalPartnerPlaces = await PartnerPlace.countDocuments();
    const totalPlaces = await Place.countDocuments();
    const totalActivePartnerPlaces = await PartnerPlace.countDocuments({ status: 'active' });
    const totalActivePlaces = await Place.countDocuments({ isActive: true });
    
    console.log(`Partner Places: ${totalPartnerPlaces} (${totalActivePartnerPlaces} active)`);
    console.log(`Places: ${totalPlaces} (${totalActivePlaces} active)`);
    console.log(`Total: ${totalPartnerPlaces + totalPlaces} địa điểm`);

    console.log('\n✅ Check hoàn thành!');
    console.log('💡 Dữ liệu Explore đã được kiểm tra thành công.');

  } catch (error) {
    console.error('❌ Check error:', error);
  }
};

const main = async () => {
  try {
    await connectDB();
    await testExploreData();
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    process.exit(0);
  }
};

main();
