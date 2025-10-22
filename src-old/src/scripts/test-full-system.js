import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

console.log('🧪 TESTING FULL SYSTEM - VeenaTravel BE\n');
console.log('='.repeat(100));

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

const logTest = (name, status, details = '') => {
  const symbol = status ? '✅' : '❌';
  console.log(`${symbol} ${name}`);
  if (details) console.log(`   ${details}`);
  results.tests.push({ name, status, details });
  if (status) results.passed++;
  else results.failed++;
};

// Test 1: Health Check
const testHealthCheck = async () => {
  console.log('\n📌 TEST 1: HEALTH CHECK');
  console.log('-'.repeat(100));
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logTest('Health Check API', response.data.success, `Status: ${response.data.status}`);
    return response.data.success;
  } catch (error) {
    logTest('Health Check API', false, error.message);
    return false;
  }
};

// Test 2: Chat AI với Itinerary Generation
const testChatWithItinerary = async () => {
  console.log('\n📌 TEST 2: CHAT AI - ITINERARY GENERATION');
  console.log('-'.repeat(100));
  try {
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/chat/message`, {
      message: 'Tôi muốn đi Đà Nẵng 2 ngày, thích biển và văn hóa, có 2 người lớn',
      userId: 'test-full-' + Date.now()
    });
    const responseTime = Date.now() - startTime;
    
    const data = response.data.data;
    
    // Check response structure
    logTest('Chat API Response', response.data.success, `Response time: ${responseTime}ms`);
    logTest('Has AI Response', !!data.response, `Length: ${data.response?.length || 0} chars`);
    logTest('Has Conversation ID', !!data.conversationId, `ID: ${data.conversationId}`);
    logTest('Has Locations', data.locations?.length > 0, `Count: ${data.locations?.length || 0}`);
    logTest('Has Itinerary', !!data.itinerary, `Days: ${data.itinerary?.days?.length || 0}`);
    logTest('Has Suggestions', data.suggestions?.length > 0, `Count: ${data.suggestions?.length || 0}`);
    
    // Check photos
    const withPhotos = data.locations?.filter(l => l.photos?.length > 0) || [];
    const avgPhotos = withPhotos.reduce((sum, l) => sum + l.photos.length, 0) / withPhotos.length;
    logTest('Locations with Photos', withPhotos.length === data.locations?.length, 
      `${withPhotos.length}/${data.locations?.length} (${avgPhotos.toFixed(1)} avg photos/location)`);
    
    // Check itinerary optimization
    const totalActivities = data.itinerary?.days?.reduce((sum, day) => sum + day.activities?.length, 0) || 0;
    const avgPerDay = totalActivities / (data.itinerary?.days?.length || 1);
    logTest('Itinerary Optimized', avgPerDay >= 4 && avgPerDay <= 7, 
      `${totalActivities} activities in ${data.itinerary?.days?.length} days (${avgPerDay.toFixed(1)} avg/day)`);
    
    return data;
  } catch (error) {
    logTest('Chat AI with Itinerary', false, error.response?.data?.message || error.message);
    return null;
  }
};

// Test 3: Photos Quality
const testPhotosQuality = async () => {
  console.log('\n📌 TEST 3: PHOTOS QUALITY & QUANTITY');
  console.log('-'.repeat(100));
  try {
    const response = await axios.post(`${BASE_URL}/chat/message`, {
      message: 'Tôi muốn đi Hội An 1 ngày, thích văn hóa',
      userId: 'test-photos-' + Date.now()
    });
    
    const locations = response.data.data.locations || [];
    
    if (locations.length === 0) {
      logTest('Photos Test', false, 'No locations returned');
      return;
    }
    
    const photoStats = locations.map(loc => ({
      name: loc.name,
      count: loc.photos?.length || 0,
      hasUrl: !!loc.photoUrl,
      hasSizes: loc.photos?.[0] ? 
        !!(loc.photos[0].url_small && loc.photos[0].url_medium && loc.photos[0].url_large) : false
    }));
    
    const totalPhotos = photoStats.reduce((sum, s) => sum + s.count, 0);
    const avgPhotos = totalPhotos / locations.length;
    const with3Sizes = photoStats.filter(s => s.hasSizes).length;
    
    logTest('Multiple Photos per Location', avgPhotos >= 5, 
      `Average: ${avgPhotos.toFixed(1)} photos/location (should be 5-10)`);
    logTest('Main Photo URL', photoStats.every(s => s.hasUrl), 
      `${photoStats.filter(s => s.hasUrl).length}/${locations.length} have photoUrl`);
    logTest('3 Sizes per Photo', with3Sizes === locations.length, 
      `${with3Sizes}/${locations.length} have small/medium/large`);
    
    // Test photo URL accessibility
    if (locations[0]?.photoUrl) {
      try {
        const photoTest = await axios.head(locations[0].photoUrl, { timeout: 5000 });
        logTest('Photo URLs Accessible', photoTest.status === 200, 'First photo URL is valid');
      } catch (photoError) {
        logTest('Photo URLs Accessible', false, 'Photo URL returned error');
      }
    }
    
    console.log('\n   📸 Photo Details:');
    photoStats.forEach((stat, idx) => {
      console.log(`   ${idx + 1}. ${stat.name}: ${stat.count} photos, URL: ${stat.hasUrl ? '✅' : '❌'}, 3 sizes: ${stat.hasSizes ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    logTest('Photos Quality Test', false, error.message);
  }
};

// Test 4: Hybrid Search API
const testHybridSearch = async () => {
  console.log('\n📌 TEST 4: HYBRID SEARCH');
  console.log('-'.repeat(100));
  try {
    const response = await axios.post(`${BASE_URL}/hybrid-search/search`, {
      query: 'nhà hàng hải sản Đà Nẵng',
      partnerLimit: 2,
      googleLimit: 5
    });
    
    const data = response.data.data;
    logTest('Hybrid Search API', response.data.success, 
      `Found ${data.results?.length || 0} places (${data.metadata?.partner_count} partners + ${data.metadata?.google_count} Google)`);
    logTest('Has Partners', (data.metadata?.partner_count || 0) > 0, 
      `Partner places: ${data.metadata?.partner_count || 0}`);
    logTest('Has Google Places', (data.metadata?.google_count || 0) > 0, 
      `Google places: ${data.metadata?.google_count || 0}`);
    
  } catch (error) {
    logTest('Hybrid Search', false, error.response?.data?.message || error.message);
  }
};

// Test 5: Maps APIs
const testMapsAPIs = async () => {
  console.log('\n📌 TEST 5: MAPS APIs');
  console.log('-'.repeat(100));
  
  // Test Nearby Search
  try {
    const response = await axios.post(`${BASE_URL}/maps/nearby`, {
      lat: 16.0544,
      lng: 108.2022,
      radius: 5000,
      type: 'restaurant'
    });
    
    logTest('Maps Nearby Search', response.data.success, 
      `Found ${response.data.data?.length || 0} places`);
    
    // Test if nearby results have photos
    const withPhotos = response.data.data?.filter(p => p.photos?.length > 0) || [];
    logTest('Nearby Search has Photos', withPhotos.length > 0, 
      `${withPhotos.length}/${response.data.data?.length || 0} with photos`);
    
  } catch (error) {
    logTest('Maps Nearby Search', false, error.message);
  }
  
  // Test Directions
  try {
    const response = await axios.post(`${BASE_URL}/maps/directions`, {
      origin: 'Đà Nẵng',
      destination: 'Hội An',
      mode: 'driving'
    });
    
    logTest('Maps Directions', response.data.success, 
      `Distance: ${response.data.data?.routes?.[0]?.legs?.[0]?.distance?.text || 'N/A'}`);
    
  } catch (error) {
    logTest('Maps Directions', false, error.message);
  }
};

// Test 6: Itinerary API (Direct)
const testItineraryAPI = async () => {
  console.log('\n📌 TEST 6: ITINERARY API (Direct)');
  console.log('-'.repeat(100));
  try {
    const response = await axios.post(`${BASE_URL}/itinerary/generate`, {
      destination: 'Nha Trang',
      days: 3,
      interests: ['biển', 'ẩm thực'],
      budget: 5000000,
      travelStyle: 'balanced',
      groupSize: 2
    });
    
    const data = response.data.data;
    const itinerary = data.itinerary || {};
    const daysCount = itinerary.days?.length || 0;
    const totalActivities = itinerary.days?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0;
    
    logTest('Itinerary Generation API', response.data.success && daysCount > 0, 
      `Generated ${daysCount} days with ${totalActivities} activities`);
    
    if (response.data.success && itinerary) {
      logTest('Has RAG Context', itinerary.ragContext === true || itinerary.ragContext === false, 
        `Database used: ${itinerary.ragContext ? 'Yes' : 'No'}`);
      
      if (daysCount > 0) {
        logTest('Has Trip ID', !!data.tripId, `Trip ID: ${data.tripId || 'N/A'}`);
      }
    }
    
  } catch (error) {
    logTest('Itinerary API', false, error.response?.data?.message || error.message);
  }
};

// Test 7: AI Intelligence (1 vs 2 vs 3 days)
const testAIIntelligence = async () => {
  console.log('\n📌 TEST 7: AI INTELLIGENCE (Trip Duration Optimization)');
  console.log('-'.repeat(100));
  
  const testCases = [
    { days: 1, destination: 'Vũng Tàu', expected: { min: 4, max: 6 } },
    { days: 2, destination: 'Đà Nẵng', expected: { min: 8, max: 13 } },
    { days: 3, destination: 'Đà Lạt', expected: { min: 12, max: 18 } }
  ];
  
  for (const testCase of testCases) {
    try {
      const response = await axios.post(`${BASE_URL}/chat/message`, {
        message: `Tôi muốn đi ${testCase.destination} ${testCase.days} ngày, thích biển và ẩm thực`,
        userId: `test-ai-${testCase.days}day-${Date.now()}`
      });
      
      const locCount = response.data.data.locations?.length || 0;
      const isOptimized = locCount >= testCase.expected.min && locCount <= testCase.expected.max;
      
      logTest(`${testCase.days} Day Trip Optimization`, isOptimized, 
        `${testCase.destination}: ${locCount} locations (expected ${testCase.expected.min}-${testCase.expected.max})`);
      
    } catch (error) {
      logTest(`${testCase.days} Day Trip`, false, error.message);
    }
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('\n🚀 Starting Full System Test...\n');
  
  await testHealthCheck();
  await testChatWithItinerary();
  await testPhotosQuality();
  await testHybridSearch();
  await testMapsAPIs();
  await testItineraryAPI();
  await testAIIntelligence();
  
  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(100));
  console.log(`\n✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, idx) => {
    const symbol = test.status ? '✅' : '❌';
    console.log(`${idx + 1}. ${symbol} ${test.name}`);
    if (test.details) console.log(`   ${test.details}`);
  });
  
  console.log('\n' + '='.repeat(100));
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! System is ready for production.');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed. Please review above.`);
  }
  
  console.log('='.repeat(100) + '\n');
};

// Wait a bit for server to be ready
setTimeout(() => {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}, 2000);
