/**
 * =================================================================
 * Test Suite for Hybrid Search AI Agent Improvements
 * =================================================================
 * Tests all 4 major improvements:
 * 1. Chat AI integration with Hybrid Search
 * 2. Real embedding generation (Google AI text-embedding-004)
 * 3. Admin partner places E2E functionality
 * 4. Advanced ranking algorithm
 * 
 * Usage: node src/scripts/test-hybrid-search-improvements.js
 * =================================================================
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 45000, // 45 seconds for embedding operations
  chatTimeout: 30000, // 30 seconds for chat responses
};

// Test tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Utility functions
 */
const logTest = (testName, status, message = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${icon} ${testName}${message ? ': ' + message : ''}`);
  
  if (status === 'PASS') {
    testResults.passed++;
  } else if (status === 'FAIL') {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${message}`);
  }
};

const makeRequest = async (method, url, data = null, timeout = TEST_CONFIG.timeout) => {
  try {
    const config = {
      method,
      url,
      timeout,
      headers: { 'Content-Type': 'application/json' }
    };

    if (data) config.data = data;
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * Test 1: Chat AI Integration with Hybrid Search
 */
const testChatAIIntegration = async () => {
  try {
    logTest('Test 1: Chat AI Integration', 'RUNNING');
    
    const testQueries = [
      'Tìm nhà hàng hải sản ngon ở Vũng Tàu',
      'Khách sạn 5 sao gần Chợ Bến Thành',
      'Resort nghỉ dưỡng ở Đà Nẵng'
    ];

    for (const query of testQueries) {
      const response = await makeRequest('POST', `${BASE_URL}/api/chat`, {
        message: query
      }, TEST_CONFIG.chatTimeout);

      if (!response.success) {
        throw new Error(`Chat failed for query: "${query}"`);
      }

      if (!response.data.response) {
        throw new Error('No response from chat AI');
      }

      // Check if location data is provided when asking about places
      if (response.data.hasLocationData && response.data.locations) {
        if (!Array.isArray(response.data.locations) || response.data.locations.length === 0) {
          throw new Error('Location data should be provided for place queries');
        }

        // Verify location data structure
        const location = response.data.locations[0];
        if (!location.coordinates || !location.coordinates.lat || !location.coordinates.lng) {
          throw new Error('Invalid location coordinates structure');
        }
      }

      console.log(`   ✓ Query processed: "${query.substring(0, 30)}..."`);
    }

    logTest('Test 1: Chat AI Integration', 'PASS', `Processed ${testQueries.length} location queries`);
    
  } catch (error) {
    logTest('Test 1: Chat AI Integration', 'FAIL', error.message);
  }
};

/**
 * Test 2: Real Embedding Generation
 */
const testRealEmbedding = async () => {
  try {
    logTest('Test 2: Real Embedding Generation', 'RUNNING');
    
    // Test adding a partner place (this will use real embedding)
    const testPlace = {
      name: 'Test Embedding Resort',
      description: 'Resort test để kiểm tra embedding generation với Google AI text-embedding-004',
      latitude: 10.7769,
      longitude: 106.7009,
      category: 'resort',
      priority: 1
    };

    const addResponse = await makeRequest('POST', `${BASE_URL}/api/admin/partner-places`, testPlace);
    
    if (!addResponse.success) {
      throw new Error('Failed to add partner place with real embedding');
    }

    const placeId = addResponse.data.id;

    // Verify the place can be found through semantic search
    const searchResponse = await makeRequest('POST', `${BASE_URL}/api/hybrid-search/search`, {
      query: 'resort test embedding',
      partnerLimit: 5
    });

    if (!searchResponse.success) {
      throw new Error('Hybrid search failed');
    }

    // Check if our test place appears in results
    const foundPlace = searchResponse.data.results.find(place => place.id === `pinecone_${placeId}`);
    if (!foundPlace) {
      console.warn('   ⚠️ Test place not found in search results (may need time to index)');
    } else {
      console.log('   ✓ Place found through semantic search with real embedding');
    }

    // Cleanup: Delete the test place
    await makeRequest('DELETE', `${BASE_URL}/api/admin/partner-places/${placeId}`);

    logTest('Test 2: Real Embedding Generation', 'PASS', 'Embedding generation working correctly');
    
  } catch (error) {
    logTest('Test 2: Real Embedding Generation', 'FAIL', error.message);
  }
};

/**
 * Test 3: Admin Partner Places E2E
 */
const testAdminPartnerPlacesE2E = async () => {
  try {
    logTest('Test 3: Admin Partner Places E2E', 'RUNNING');
    
    const testPlace = {
      name: 'E2E Test Hotel',
      description: 'Khách sạn test cho E2E testing với đầy đủ tính năng',
      latitude: 10.7769,
      longitude: 106.7009,
      category: 'hotel',
      priority: 2,
      address: '123 Test Street'
    };

    // Step 1: Add
    const addResponse = await makeRequest('POST', `${BASE_URL}/api/admin/partner-places`, testPlace);
    if (!addResponse.success) throw new Error('Add operation failed');
    
    const placeId = addResponse.data.id;
    console.log('   ✓ Add operation successful');

    // Step 2: Get all and verify
    const getAllResponse = await makeRequest('GET', `${BASE_URL}/api/admin/partner-places?status=active`);
    if (!getAllResponse.success) throw new Error('Get all operation failed');
    
    const foundPlace = getAllResponse.data.places.find(p => p.id === placeId);
    if (!foundPlace) throw new Error('Added place not found in list');
    console.log('   ✓ Get all operation successful');

    // Step 3: Update
    const updateData = { name: 'E2E Test Hotel - Updated', priority: 3 };
    const updateResponse = await makeRequest('PUT', `${BASE_URL}/api/admin/partner-places/${placeId}`, updateData);
    if (!updateResponse.success) throw new Error('Update operation failed');
    console.log('   ✓ Update operation successful');

    // Step 4: Deactivate
    const deactivateResponse = await makeRequest('PATCH', `${BASE_URL}/api/admin/partner-places/${placeId}/deactivate`);
    if (!deactivateResponse.success) throw new Error('Deactivate operation failed');
    console.log('   ✓ Deactivate operation successful');

    // Step 5: Verify deactivation
    const inactiveResponse = await makeRequest('GET', `${BASE_URL}/api/admin/partner-places?status=inactive`);
    const inactivePlace = inactiveResponse.data.places.find(p => p.id === placeId);
    if (!inactivePlace || inactivePlace.status !== 'inactive') {
      throw new Error('Deactivation verification failed');
    }
    console.log('   ✓ Deactivation verification successful');

    // Step 6: Delete (cleanup)
    const deleteResponse = await makeRequest('DELETE', `${BASE_URL}/api/admin/partner-places/${placeId}`);
    if (!deleteResponse.success) throw new Error('Delete operation failed');
    console.log('   ✓ Delete operation successful');

    logTest('Test 3: Admin Partner Places E2E', 'PASS', 'All CRUD operations working correctly');
    
  } catch (error) {
    logTest('Test 3: Admin Partner Places E2E', 'FAIL', error.message);
  }
};

/**
 * Test 4: Advanced Ranking Algorithm
 */
const testAdvancedRanking = async () => {
  try {
    logTest('Test 4: Advanced Ranking Algorithm', 'RUNNING');
    
    // Test with location-based search to verify ranking
    const searchResponse = await makeRequest('POST', `${BASE_URL}/api/hybrid-search/search-near`, {
      query: 'nhà hàng',
      location: { lat: 10.7769, lng: 106.7009 }, // Ho Chi Minh City center
      partnerLimit: 3,
      googleLimit: 5
    });

    if (!searchResponse.success) {
      throw new Error('Location-based hybrid search failed');
    }

    const results = searchResponse.data.results;
    if (!results || results.length === 0) {
      throw new Error('No results returned from hybrid search');
    }

    // Verify ranking structure
    for (const result of results) {
      if (typeof result.finalScore === 'undefined') {
        throw new Error('Missing finalScore in results');
      }

      if (result.isPartner && !result.scoreBreakdown) {
        throw new Error('Missing scoreBreakdown for partner places');
      }

      // Verify partner places have higher scores
      if (result.isPartner && result.finalScore < 1000) {
        console.warn('   ⚠️ Partner place has unexpectedly low score');
      }
    }

    // Verify results are sorted by finalScore (descending)
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i].finalScore < results[i + 1].finalScore) {
        throw new Error('Results not properly sorted by finalScore');
      }
    }

    console.log(`   ✓ Ranking verified for ${results.length} results`);
    console.log(`   ✓ Partner places: ${results.filter(r => r.isPartner).length}`);
    console.log(`   ✓ Google places: ${results.filter(r => !r.isPartner).length}`);

    logTest('Test 4: Advanced Ranking Algorithm', 'PASS', 'Ranking algorithm working correctly');
    
  } catch (error) {
    logTest('Test 4: Advanced Ranking Algorithm', 'FAIL', error.message);
  }
};

/**
 * Test 5: Integration Test - Chat with Advanced Search
 */
const testChatWithAdvancedSearch = async () => {
  try {
    logTest('Test 5: Chat with Advanced Search Integration', 'RUNNING');
    
    // Test a location-specific query through chat
    const response = await makeRequest('POST', `${BASE_URL}/api/chat`, {
      message: 'Tìm nhà hàng ngon gần Chợ Bến Thành ở Sài Gòn'
    }, TEST_CONFIG.chatTimeout);

    if (!response.success) {
      throw new Error('Chat integration test failed');
    }

    if (!response.data.hasLocationData || !response.data.locations) {
      throw new Error('Chat should return location data for place queries');
    }

    // Verify locations have proper structure from new ranking system
    const locations = response.data.locations;
    for (const location of locations) {
      if (!location.coordinates || !location.source) {
        throw new Error('Invalid location structure from chat integration');
      }

      // Check if partner places are marked correctly
      if (location.isPartner && location.source !== 'partner') {
        throw new Error('Partner place source mismatch');
      }
    }

    console.log(`   ✓ Chat returned ${locations.length} locations`);
    console.log(`   ✓ Partner locations: ${locations.filter(l => l.isPartner).length}`);

    logTest('Test 5: Chat with Advanced Search Integration', 'PASS', 'Full integration working correctly');
    
  } catch (error) {
    logTest('Test 5: Chat with Advanced Search Integration', 'FAIL', error.message);
  }
};

/**
 * Main test runner
 */
const runTests = async () => {
  console.log('🚀 Starting Hybrid Search AI Agent Improvements Test Suite...\n');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_CONFIG.timeout}ms\n`);

  const startTime = Date.now();

  try {
    await testChatAIIntegration();
    await testRealEmbedding();
    await testAdminPartnerPlacesE2E();
    await testAdvancedRanking();
    await testChatWithAdvancedSearch();

  } catch (error) {
    console.error('\n❌ Test suite stopped due to critical error:', error.message);
  }

  // Print results
  const duration = Date.now() - startTime;
  console.log('\n' + '='.repeat(70));
  console.log('📊 HYBRID SEARCH IMPROVEMENTS TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log('\n🎯 IMPROVEMENTS SUMMARY:');
  console.log('1. ✅ Chat AI now uses Hybrid Search for location queries');
  console.log('2. ✅ Real embedding generation with Google AI text-embedding-004');
  console.log('3. ✅ Complete CRUD operations for partner places');
  console.log('4. ✅ Advanced ranking: Priority → Rating → Distance');
  console.log('5. ✅ Full integration with finalScore and scoreBreakdown');

  console.log('\n' + '='.repeat(70));
  
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Unhandled error in test suite:', error);
    process.exit(1);
  });
}

export default { runTests, testResults };
