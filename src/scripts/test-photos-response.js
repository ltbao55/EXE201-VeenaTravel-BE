import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

/**
 * Test Photo URLs in API Responses
 */

// Helper function để hiển thị kết quả
const logResult = (testName, success, data = null, error = null) => {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 TEST: ${testName}`);
  console.log('='.repeat(80));
  
  if (success) {
    console.log('✅ STATUS: PASSED');
    if (data) {
      console.log('📊 DATA:', JSON.stringify(data, null, 2));
    }
  } else {
    console.log('❌ STATUS: FAILED');
    if (error) {
      console.log('🔴 ERROR:', error);
    }
  }
  
  console.log('='.repeat(80));
};

// Helper để check photos trong response
const checkPhotos = (locations, testName) => {
  if (!locations || locations.length === 0) {
    console.log(`⚠️  ${testName}: No locations found`);
    return false;
  }
  
  console.log(`\n📍 ${testName}: Found ${locations.length} locations`);
  
  locations.forEach((loc, index) => {
    console.log(`\nLocation ${index + 1}: ${loc.name}`);
    
    // Check photoUrl
    if (loc.photoUrl) {
      console.log(`  ✅ photoUrl: ${loc.photoUrl.substring(0, 80)}...`);
    } else {
      console.log(`  ⚠️  photoUrl: Not available`);
    }
    
    // Check photos array
    if (loc.photos && loc.photos.length > 0) {
      console.log(`  ✅ photos[]: ${loc.photos.length} photos`);
      loc.photos.forEach((photo, photoIndex) => {
        console.log(`     Photo ${photoIndex + 1}:`);
        console.log(`       - url_small: ${photo.url_small ? '✅' : '❌'}`);
        console.log(`       - url_medium: ${photo.url_medium ? '✅' : '❌'}`);
        console.log(`       - url_large: ${photo.url_large ? '✅' : '❌'}`);
      });
    } else {
      console.log(`  ⚠️  photos[]: Not available`);
    }
    
    // Check coordinates
    if (loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
      console.log(`  ✅ coordinates: (${loc.coordinates.lat}, ${loc.coordinates.lng})`);
    } else {
      console.log(`  ⚠️  coordinates: Not available`);
    }
  });
  
  return true;
};

// Test 1: Chat API - Main endpoint
const testChatAPI = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/chat/message`, {
      message: 'Tôi muốn đi Đà Nẵng 2 ngày, thích biển và ẩm thực',
      userId: 'test-user-photos'
    });
    
    const locations = response.data.data.locations;
    checkPhotos(locations, 'CHAT API');
    
    logResult('1. Chat API (/api/chat/message)', true, {
      conversationId: response.data.data.conversationId,
      locationCount: locations.length,
      hasPhotos: locations.some(l => l.photoUrl || (l.photos && l.photos.length > 0)),
      sampleLocation: locations[0] ? {
        name: locations[0].name,
        hasPhotoUrl: !!locations[0].photoUrl,
        photosCount: locations[0].photos?.length || 0
      } : null
    });
    
    return response.data;
    
  } catch (error) {
    logResult('1. Chat API (/api/chat/message)', false, null, error.message);
    throw error;
  }
};

// Test 2: Hybrid Search API
const testHybridSearchAPI = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/hybrid-search/search`, {
      query: 'nhà hàng hải sản Đà Nẵng',
      partnerLimit: 2,
      googleLimit: 8,
      location: {
        lat: 16.047079,
        lng: 108.20623
      }
    });
    
    const locations = response.data.data.results;
    checkPhotos(locations, 'HYBRID SEARCH API');
    
    logResult('2. Hybrid Search API (/api/hybrid-search/search)', true, {
      totalResults: response.data.data.totalResults,
      partnerCount: response.data.data.partnerCount,
      googleCount: response.data.data.googleCount,
      hasPhotos: locations.some(l => l.photoUrl || (l.photos && l.photos.length > 0))
    });
    
    return response.data;
    
  } catch (error) {
    logResult('2. Hybrid Search API (/api/hybrid-search/search)', false, null, error.message);
    throw error;
  }
};

// Test 3: Google Maps Nearby API
const testMapsNearbyAPI = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/maps/nearby`, {
      lat: 16.047079,
      lng: 108.20623,
      radius: 5000,
      type: 'restaurant'
    });
    
    const locations = response.data.data;
    checkPhotos(locations, 'MAPS NEARBY API');
    
    logResult('3. Maps Nearby API (/api/maps/nearby)', true, {
      resultCount: locations.length,
      hasPhotos: locations.some(l => l.photos && l.photos.length > 0),
      samplePlace: locations[0] ? {
        name: locations[0].name,
        photosCount: locations[0].photos?.length || 0,
        hasUrls: locations[0].photos?.[0]?.url_medium ? true : false
      } : null
    });
    
    return response.data;
    
  } catch (error) {
    logResult('3. Maps Nearby API (/api/maps/nearby)', false, null, error.message);
    throw error;
  }
};

// Test 4: Google Maps Place Details API
const testMapsPlaceDetailsAPI = async () => {
  try {
    // First get a place_id from nearby search
    const nearbyResponse = await axios.post(`${BASE_URL}/maps/nearby`, {
      lat: 16.047079,
      lng: 108.20623,
      radius: 5000,
      type: 'restaurant'
    });
    
    const placeId = nearbyResponse.data.data[0]?.place_id;
    
    if (!placeId) {
      throw new Error('No place_id found from nearby search');
    }
    
    const response = await axios.get(`${BASE_URL}/maps/place/${placeId}`);
    
    const place = response.data.data;
    console.log(`\n📍 Place Details: ${place.name}`);
    console.log(`  - Photos count: ${place.photos?.length || 0}`);
    
    if (place.photos && place.photos.length > 0) {
      console.log(`  ✅ Photos available!`);
      place.photos.forEach((photo, index) => {
        console.log(`     Photo ${index + 1}: ${photo.width}x${photo.height}`);
      });
    }
    
    logResult('4. Maps Place Details API (/api/maps/place/:id)', true, {
      placeName: place.name,
      photosCount: place.photos?.length || 0,
      rating: place.rating,
      hasPhotos: place.photos && place.photos.length > 0
    });
    
    return response.data;
    
  } catch (error) {
    logResult('4. Maps Place Details API (/api/maps/place/:id)', false, null, error.message);
    throw error;
  }
};

// Test 5: Directions API
const testDirectionsAPI = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/maps/directions`, {
      origin: 'Hà Nội',
      destination: 'Đà Nẵng',
      mode: 'driving'
    });
    
    logResult('5. Directions API (/api/maps/directions)', true, {
      status: response.data.data.status,
      routesCount: response.data.data.routes?.length || 0,
      hasRoutes: response.data.data.routes && response.data.data.routes.length > 0,
      distance: response.data.data.routes?.[0]?.legs?.[0]?.distance?.text,
      duration: response.data.data.routes?.[0]?.legs?.[0]?.duration?.text
    });
    
    return response.data;
    
  } catch (error) {
    logResult('5. Directions API (/api/maps/directions)', false, null, error.message);
    throw error;
  }
};

// Test 6: Itinerary Generate API
const testItineraryAPI = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/itinerary/generate`, {
      destination: 'Đà Nẵng',
      days: 2,
      interests: ['biển', 'ẩm thực'],
      budget: 'medium',
      groupSize: 2
    });
    
    const locations = response.data.data.locations || [];
    checkPhotos(locations, 'ITINERARY API');
    
    logResult('6. Itinerary API (/api/itinerary/generate)', true, {
      itineraryTitle: response.data.data.itinerary?.title,
      daysCount: response.data.data.itinerary?.days?.length,
      locationsCount: locations.length,
      hasPhotos: locations.some(l => l.photoUrl || (l.photos && l.photos.length > 0))
    });
    
    return response.data;
    
  } catch (error) {
    logResult('6. Itinerary API (/api/itinerary/generate)', false, null, error.message);
    throw error;
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('\n🚀 STARTING PHOTO RESPONSE TESTS...\n');
  console.log('Testing all APIs that should return photos\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  const tests = [
    { name: 'Chat API', fn: testChatAPI },
    { name: 'Hybrid Search API', fn: testHybridSearchAPI },
    { name: 'Maps Nearby API', fn: testMapsNearbyAPI },
    { name: 'Maps Place Details API', fn: testMapsPlaceDetailsAPI },
    { name: 'Directions API', fn: testDirectionsAPI },
    { name: 'Itinerary API', fn: testItineraryAPI }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n⏳ Running: ${test.name}...`);
      await test.fn();
      results.passed++;
      results.tests.push({ name: test.name, status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: test.name, status: 'FAILED', error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('\nDetailed Results:');
  results.tests.forEach(test => {
    const icon = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`  ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });
  console.log('='.repeat(80));
  
  process.exit(results.failed > 0 ? 1 : 0);
};

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

