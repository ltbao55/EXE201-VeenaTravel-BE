import dotenv from 'dotenv';
import googleMapsService from '../services/googlemaps-service.js';

// Load environment variables
dotenv.config();

/**
 * Test Google Maps API connection and functionality
 */
async function testGoogleMapsAPI() {
  console.log('🚀 Bắt đầu test Google Maps API...\n');
  
  // Test 1: Geocoding - Lấy tọa độ từ địa chỉ
  console.log('📍 Test 1: Geocoding (Địa chỉ → Tọa độ)');
  try {
    const geocodeResult = await googleMapsService.getCoordinates('Chợ Bến Thành, Hồ Chí Minh');
    if (geocodeResult.success) {
      console.log('✅ Geocoding thành công!');
      console.log(`   Địa chỉ: ${geocodeResult.data.formatted_address}`);
      console.log(`   Tọa độ: ${geocodeResult.data.lat}, ${geocodeResult.data.lng}`);
      console.log(`   Place ID: ${geocodeResult.data.place_id}\n`);
    } else {
      console.log('❌ Geocoding thất bại:', geocodeResult.message);
    }
  } catch (error) {
    console.log('❌ Lỗi Geocoding:', error.message);
  }

  // Test 2: Reverse Geocoding - Lấy địa chỉ từ tọa độ
  console.log('📍 Test 2: Reverse Geocoding (Tọa độ → Địa chỉ)');
  try {
    const reverseResult = await googleMapsService.getAddress(10.762622, 106.660172);
    if (reverseResult.success) {
      console.log('✅ Reverse Geocoding thành công!');
      console.log(`   Địa chỉ: ${reverseResult.data}\n`);
    } else {
      console.log('❌ Reverse Geocoding thất bại:', reverseResult.message);
    }
  } catch (error) {
    console.log('❌ Lỗi Reverse Geocoding:', error.message);
  }

  // Test 3: Nearby Search - Tìm địa điểm gần đây
  console.log('📍 Test 3: Nearby Search (Tìm địa điểm gần đây)');
  try {
    const nearbyResult = await googleMapsService.searchNearbyPlaces(
      { lat: 10.762622, lng: 106.660172 }, // Chợ Bến Thành
      'tourist_attraction',
      2000
    );
    if (nearbyResult.success) {
      console.log('✅ Nearby Search thành công!');
      console.log(`   Tìm thấy ${nearbyResult.data.length} địa điểm:`);
      nearbyResult.data.slice(0, 3).forEach((place, index) => {
        console.log(`   ${index + 1}. ${place.name} - Rating: ${place.rating || 'N/A'}`);
      });
      console.log('');
    } else {
      console.log('❌ Nearby Search thất bại:', nearbyResult.message);
    }
  } catch (error) {
    console.log('❌ Lỗi Nearby Search:', error.message);
  }

  // Test 4: Place Details - Lấy chi tiết địa điểm
  console.log('📍 Test 4: Place Details (Chi tiết địa điểm)');
  try {
    // Sử dụng Place ID của Chợ Bến Thành
    const detailsResult = await googleMapsService.getPlaceDetails('ChIJhWF_vVcvdTERKD3kfm8wGAE');
    if (detailsResult.success) {
      console.log('✅ Place Details thành công!');
      console.log(`   Tên: ${detailsResult.data.name}`);
      console.log(`   Địa chỉ: ${detailsResult.data.formatted_address}`);
      console.log(`   Rating: ${detailsResult.data.rating || 'N/A'}`);
      console.log(`   Số điện thoại: ${detailsResult.data.formatted_phone_number || 'N/A'}`);
      console.log('');
    } else {
      console.log('❌ Place Details thất bại:', detailsResult.message);
    }
  } catch (error) {
    console.log('❌ Lỗi Place Details:', error.message);
  }

  // Test 5: Distance Matrix - Tính khoảng cách
  console.log('📍 Test 5: Distance Matrix (Tính khoảng cách)');
  try {
    const distanceResult = await googleMapsService.getDistanceMatrix(
      ['Chợ Bến Thành, Hồ Chí Minh'],
      ['Nhà Thờ Đức Bà, Hồ Chí Minh'],
      'walking'
    );
    if (distanceResult.success) {
      console.log('✅ Distance Matrix thành công!');
      const element = distanceResult.data.rows[0].elements[0];
      if (element.status === 'OK') {
        console.log(`   Khoảng cách: ${element.distance.text}`);
        console.log(`   Thời gian: ${element.duration.text}`);
      }
      console.log('');
    } else {
      console.log('❌ Distance Matrix thất bại:', distanceResult.message);
    }
  } catch (error) {
    console.log('❌ Lỗi Distance Matrix:', error.message);
  }

  // Test 6: Directions - Tìm đường đi
  console.log('📍 Test 6: Directions (Tìm đường đi)');
  try {
    const directionsResult = await googleMapsService.getDirections(
      'Chợ Bến Thành, Hồ Chí Minh',
      'Nhà Thờ Đức Bà, Hồ Chí Minh',
      'walking'
    );
    if (directionsResult.success) {
      console.log('✅ Directions thành công!');
      const route = directionsResult.data.routes[0];
      console.log(`   Tổng khoảng cách: ${route.legs[0].distance.text}`);
      console.log(`   Tổng thời gian: ${route.legs[0].duration.text}`);
      console.log(`   Số bước: ${route.legs[0].steps.length} bước`);
      console.log('');
    } else {
      console.log('❌ Directions thất bại:', directionsResult.message);
    }
  } catch (error) {
    console.log('❌ Lỗi Directions:', error.message);
  }

  console.log('🎉 Hoàn thành test Google Maps API!');
}

// Chạy test
testGoogleMapsAPI().catch(console.error);
