import axios from 'axios';

/**
 * =================================================================
 * Hybrid Search System Test Suite
 * =================================================================
 * Comprehensive test cases for the hybrid search functionality.
 * =================================================================
 */

const BASE_URL = 'http://localhost:5001/api';
const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

class HybridSearchTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  async runTest(testName, testFunction) {
    this.totalTests++;
    this.log(`\n🧪 Testing: ${testName}`, COLORS.BLUE);
    
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      
      this.passedTests++;
      this.log(`✅ PASSED: ${testName} (${duration}ms)`, COLORS.GREEN);
      this.testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      this.log(`❌ FAILED: ${testName} - ${error.message}`, COLORS.RED);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testHybridSearch() {
    const response = await axios.post(`${BASE_URL}/hybrid-search/search`, {
      query: 'nhà hàng hải sản ngon',
      partnerLimit: 2,
      googleLimit: 5
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error(`Search failed: ${response.data.message}`);
    }

    if (!response.data.data.results || response.data.data.results.length === 0) {
      throw new Error('No results returned');
    }

    this.log(`   📊 Found ${response.data.data.results.length} results`);
    this.log(`   🤝 Partner places: ${response.data.data.metadata.partner_count}`);
    this.log(`   🗺️ Google places: ${response.data.data.metadata.google_count}`);
  }

  async testSearchWithLocation() {
    const response = await axios.post(`${BASE_URL}/hybrid-search/search-near`, {
      query: 'khách sạn',
      location: {
        lat: 10.7769,
        lng: 106.7009
      },
      partnerLimit: 1,
      googleLimit: 3
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error(`Location search failed: ${response.data.message}`);
    }

    this.log(`   📍 Location-based search returned ${response.data.data.results.length} results`);
  }

  async testCacheHit() {
    const query = 'test cache query';
    
    // First request - should be cache miss
    const response1 = await axios.post(`${BASE_URL}/hybrid-search/search`, {
      query,
      partnerLimit: 1,
      googleLimit: 2
    });

    // Second request - should be cache hit
    const response2 = await axios.post(`${BASE_URL}/hybrid-search/search`, {
      query,
      partnerLimit: 1,
      googleLimit: 2
    });

    if (response1.data.data.metadata.cached === true) {
      throw new Error('First request should not be cached');
    }

    if (response2.data.cached !== true) {
      throw new Error('Second request should be cached');
    }

    this.log('   🎯 Cache mechanism working correctly');
  }

  async testHealthStatus() {
    const response = await axios.get(`${BASE_URL}/hybrid-search/health`);

    if (!response.data.data.status) {
      throw new Error('Health status not returned');
    }

    this.log(`   💚 System status: ${response.data.data.status}`);
    this.log(`   ⚠️ Error rate: ${response.data.data.errorRate}%`);
  }

  async testSearchStats() {
    const response = await axios.get(`${BASE_URL}/hybrid-search/stats`);

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.data.searches) {
      throw new Error('Search statistics not returned');
    }

    this.log(`   📊 Total searches: ${response.data.data.searches.total}`);
    this.log(`   ✅ Successful: ${response.data.data.searches.successful}`);
    this.log(`   ❌ Failed: ${response.data.data.searches.failed}`);
  }

  async testCacheStats() {
    const response = await axios.get(`${BASE_URL}/hybrid-search/cache/stats`);

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.data.total_entries !== undefined) {
      throw new Error('Cache statistics not returned');
    }

    this.log(`   💾 Cache entries: ${response.data.data.total_entries}`);
    this.log(`   🎯 Total hits: ${response.data.data.total_hits}`);
  }

  async testPartnerPlaceManagement() {
    // Test adding a partner place
    const newPlace = {
      name: 'Test Partner Restaurant',
      description: 'A test restaurant for partner places',
      latitude: 10.7769,
      longitude: 106.7009,
      category: 'nhà hàng',
      priority: 1
    };

    const addResponse = await axios.post(`${BASE_URL}/admin/partner-places`, newPlace);

    if (addResponse.status !== 201) {
      throw new Error(`Expected status 201, got ${addResponse.status}`);
    }

    if (!addResponse.data.success) {
      throw new Error(`Add partner place failed: ${addResponse.data.message}`);
    }

    const placeId = addResponse.data.data.id;
    this.log(`   ➕ Added partner place: ${placeId}`);

    // Test getting all partner places
    const listResponse = await axios.get(`${BASE_URL}/admin/partner-places`);

    if (listResponse.status !== 200) {
      throw new Error(`Expected status 200, got ${listResponse.status}`);
    }

    this.log(`   📋 Total partner places: ${listResponse.data.data.total}`);

    // Test deactivating the partner place
    const deactivateResponse = await axios.patch(`${BASE_URL}/admin/partner-places/${placeId}/deactivate`);

    if (deactivateResponse.status !== 200) {
      throw new Error(`Expected status 200, got ${deactivateResponse.status}`);
    }

    this.log(`   🔒 Deactivated partner place: ${placeId}`);
  }

  async testErrorHandling() {
    // Test with empty query
    try {
      await axios.post(`${BASE_URL}/hybrid-search/search`, {
        query: '',
        partnerLimit: 2,
        googleLimit: 5
      });
      throw new Error('Should have failed with empty query');
    } catch (error) {
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
    }

    // Test with invalid location
    try {
      await axios.post(`${BASE_URL}/hybrid-search/search-near`, {
        query: 'test',
        location: { lat: 'invalid' },
        partnerLimit: 1,
        googleLimit: 2
      });
      throw new Error('Should have failed with invalid location');
    } catch (error) {
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
    }

    this.log('   ✅ Error handling working correctly');
  }

  async runAllTests() {
    this.log('🚀 Starting Hybrid Search System Test Suite', COLORS.YELLOW);
    this.log('=' .repeat(60), COLORS.YELLOW);

    await this.runTest('Hybrid Search Basic', () => this.testHybridSearch());
    await this.runTest('Search with Location', () => this.testSearchWithLocation());
    await this.runTest('Cache Mechanism', () => this.testCacheHit());
    await this.runTest('Health Status', () => this.testHealthStatus());
    await this.runTest('Search Statistics', () => this.testSearchStats());
    await this.runTest('Cache Statistics', () => this.testCacheStats());
    await this.runTest('Partner Place Management', () => this.testPartnerPlaceManagement());
    await this.runTest('Error Handling', () => this.testErrorHandling());

    this.printSummary();
  }

  printSummary() {
    this.log('\n' + '=' .repeat(60), COLORS.YELLOW);
    this.log('📊 TEST SUMMARY', COLORS.YELLOW);
    this.log('=' .repeat(60), COLORS.YELLOW);
    
    this.log(`Total Tests: ${this.totalTests}`);
    this.log(`Passed: ${this.passedTests}`, COLORS.GREEN);
    this.log(`Failed: ${this.totalTests - this.passedTests}`, COLORS.RED);
    this.log(`Success Rate: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);

    if (this.passedTests === this.totalTests) {
      this.log('\n🎉 All tests passed! Hybrid Search System is working correctly.', COLORS.GREEN);
    } else {
      this.log('\n⚠️ Some tests failed. Please check the logs above.', COLORS.RED);
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new HybridSearchTester();
  tester.runAllTests().catch(console.error);
}

export default HybridSearchTester;
