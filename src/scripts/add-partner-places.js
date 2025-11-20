import pineconeService from '../services/pinecone-service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to add test partner places to Pinecone database
 * This will help verify the partner places priority system
 */

const testPartnerPlaces = [
  {
    id: 'partner_vt_imperial_hotel',
    name: 'The IMPERIAL Hotel Vung Tau',
    description: 'Khách sạn 5 sao cao cấp tại Vũng Tàu với view biển tuyệt đẹp, casino, spa và nhà hàng hải sản',
    metadata: {
      latitude: 10.3439636,
      longitude: 107.0949631,
      rating: 4.8,
      category: 'accommodation',
      type: 'hotel',
      address: '159 Thùy Vân, Phường Thắng Tam, Vũng Tàu',
      isPartner: true,
      priority: 1, // Highest priority
      partnerType: 'premium',
      amenities: ['spa', 'casino', 'restaurant', 'pool', 'beach_access'],
      priceRange: 'luxury'
    }
  },
  {
    id: 'partner_vt_seaside_resort',
    name: 'Vũng Tàu Seaside Resort & Spa',
    description: 'Resort nghỉ dưỡng biển với spa cao cấp, bể bơi vô cực và nhà hàng hải sản tươi sống',
    metadata: {
      latitude: 10.3421,
      longitude: 107.0923,
      rating: 4.6,
      category: 'accommodation',
      type: 'resort',
      address: 'Bãi Sau, Vũng Tàu',
      isPartner: true,
      priority: 2,
      partnerType: 'premium',
      amenities: ['spa', 'infinity_pool', 'restaurant', 'beach_access', 'gym'],
      priceRange: 'luxury'
    }
  },
  {
    id: 'partner_vt_seafood_palace',
    name: 'Hải Sản Hoàng Gia Vũng Tàu',
    description: 'Nhà hàng hải sản cao cấp với hải sản tươi sống, view biển đẹp và không gian sang trọng',
    metadata: {
      latitude: 10.3456,
      longitude: 107.0934,
      rating: 4.7,
      category: 'food',
      type: 'restaurant',
      address: 'Thùy Vân, Vũng Tàu',
      isPartner: true,
      priority: 1,
      partnerType: 'featured',
      cuisine: ['seafood', 'vietnamese'],
      priceRange: 'mid_to_high',
      specialties: ['cua_hoàng_đế', 'tôm_hùm', 'cá_song']
    }
  },
  {
    id: 'partner_dl_dalat_palace',
    name: 'Dalat Palace Heritage Hotel',
    description: 'Khách sạn lịch sử sang trọng tại Đà Lạt với kiến trúc Pháp cổ, sân golf và spa',
    metadata: {
      latitude: 11.9404,
      longitude: 108.4583,
      rating: 4.9,
      category: 'accommodation',
      type: 'heritage_hotel',
      address: '2 Trần Phú, Đà Lạt',
      isPartner: true,
      priority: 1,
      partnerType: 'premium',
      amenities: ['golf_course', 'spa', 'restaurant', 'heritage_architecture'],
      priceRange: 'luxury',
      established: '1922'
    }
  },
  {
    id: 'partner_dl_flower_garden_cafe',
    name: 'Dalat Flower Garden Café',
    description: 'Quán cà phê view vườn hoa đẹp nhất Đà Lạt với cà phê đặc sản và bánh ngọt handmade',
    metadata: {
      latitude: 11.9356,
      longitude: 108.4419,
      rating: 4.5,
      category: 'food',
      type: 'cafe',
      address: 'Hoa Binh, Đà Lạt',
      isPartner: true,
      priority: 2,
      partnerType: 'featured',
      specialties: ['ca_phe_chon', 'banh_mi_dalat', 'sua_dau_nanh'],
      priceRange: 'budget_friendly',
      atmosphere: 'garden_view'
    }
  },
  {
    id: 'partner_hn_metropole_hotel',
    name: 'Sofitel Legend Metropole Hanoi',
    description: 'Khách sạn lịch sử 5 sao tại Hà Nội với kiến trúc Pháp cổ, spa cao cấp và nhà hàng Michelin',
    metadata: {
      latitude: 21.0285,
      longitude: 105.8048,
      rating: 4.8,
      category: 'accommodation',
      type: 'luxury_hotel',
      address: '15 Ngô Quyền, Hoàn Kiếm, Hà Nội',
      isPartner: true,
      priority: 1,
      partnerType: 'premium',
      amenities: ['spa', 'michelin_restaurant', 'pool', 'heritage_architecture'],
      priceRange: 'luxury',
      awards: ['michelin_guide', 'heritage_hotel']
    }
  }
];

/**
 * Add partner places to Pinecone database
 */
const addPartnerPlaces = async () => {
  try {
    console.log('🚀 Starting to add partner places to Pinecone database...');
    
    const result = await pineconeService.batchUpsertPlaces(testPartnerPlaces);
    
    if (result.success) {
      console.log(`✅ Successfully added ${result.processed} partner places!`);
      console.log('📊 Partner places added:');
      testPartnerPlaces.forEach(place => {
        console.log(`   - ${place.name} (Priority: ${place.metadata.priority}, Type: ${place.metadata.partnerType})`);
      });
    } else {
      console.error('❌ Failed to add partner places:', result.message);
    }
    
  } catch (error) {
    console.error('💥 Error adding partner places:', error);
  }
};

/**
 * Test partner places search
 */
const testPartnerSearch = async () => {
  try {
    console.log('\n🔍 Testing partner places search...');
    
    const searchQueries = [
      'khách sạn cao cấp Vũng Tàu',
      'nhà hàng hải sản Vũng Tàu', 
      'resort Đà Lạt',
      'khách sạn lịch sử Hà Nội'
    ];
    
    for (const query of searchQueries) {
      console.log(`\n🔎 Searching for: "${query}"`);
      
      const result = await pineconeService.semanticSearch(query, {
        limit: 5,
        filter: { isPartner: { $eq: true } }
      });
      
      if (result.success && result.data.results.length > 0) {
        console.log(`   Found ${result.data.results.length} partner places:`);
        result.data.results.forEach(place => {
          console.log(`   - ${place.metadata.name} (Score: ${place.score.toFixed(3)}, Priority: ${place.metadata.priority})`);
        });
      } else {
        console.log('   No partner places found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing partner search:', error);
  }
};

/**
 * Main execution
 */
const main = async () => {
  console.log('🎯 Partner Places Setup Script');
  console.log('================================\n');
  
  // Add partner places
  await addPartnerPlaces();
  
  // Wait a bit for indexing
  console.log('\n⏳ Waiting 3 seconds for indexing...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test search
  await testPartnerSearch();
  
  console.log('\n🎉 Partner places setup completed!');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
