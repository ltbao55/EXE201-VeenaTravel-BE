/**
 * Simple Explore API Test (No external dependencies)
 * Usage: node src/scripts/test-explore-simple.js
 */

const API_URL = process.env.API_BASE_URL || 'http://localhost:5001/api';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

async function testEndpoint(name, url) {
  try {
    log.info(`Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (response.ok && data.success) {
      log.success(`${name} - Status: ${response.status} - Time: ${duration}ms`);
      
      // Print summary
      if (data.data?.items) {
        console.log(`   📊 Results: ${data.data.items.length} items`);
        if (data.data.pagination) {
          console.log(`   📄 Page ${data.data.pagination.page}/${data.data.pagination.totalPages}, Total: ${data.data.pagination.total}`);
        }
        if (data.data.sources) {
          console.log(`   🔗 Sources: Places=${data.data.sources.places}, Partners=${data.data.sources.partners}, Google=${data.data.sources.google}`);
        }
      } else if (data.data?.categories) {
        console.log(`   📂 Categories: ${data.data.categories.length} found`);
      }
      
      return { success: true, data };
    } else {
      log.error(`${name} - Failed: ${data.message || 'Unknown error'}`);
      return { success: false };
    }
  } catch (error) {
    log.error(`${name} - Error: ${error.message}`);
    return { success: false, error };
  }
}

async function runTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 EXPLORE API TEST SUITE (Simple)`);
  console.log(`API URL: ${API_URL}`);
  console.log(`${'='.repeat(60)}\n`);

  const results = { total: 0, passed: 0, failed: 0 };

  // Test 1: Health Check
  log.section('TEST 0: Health Check');
  const health = await testEndpoint('Health Check', `${API_URL.replace('/api', '')}/api/health`);
  if (!health.success) {
    log.error('Server is not running or not accessible!');
    log.info('Please start the server first: npm run dev');
    process.exit(1);
  }

  // Test 1: Basic Explore
  log.section('TEST 1: Basic Explore');
  const test1 = await testEndpoint('Basic Explore', `${API_URL}/explore?page=1&limit=10`);
  results.total++; if (test1.success) results.passed++; else results.failed++;

  // Test 2: Filter by City
  log.section('TEST 2: Filter by City');
  const test2 = await testEndpoint('City Filter', `${API_URL}/explore?city=Vũng Tàu&limit=10`);
  results.total++; if (test2.success) results.passed++; else results.failed++;

  // Test 3: Filter by Category
  log.section('TEST 3: Filter by Category');
  const test3 = await testEndpoint('Category Filter', `${API_URL}/explore?category=restaurant&limit=10`);
  results.total++; if (test3.success) results.passed++; else results.failed++;

  // Test 4: Sort by Rating
  log.section('TEST 4: Sort by Rating');
  const test4 = await testEndpoint('Sort Rating', `${API_URL}/explore?sort=rating&limit=10`);
  results.total++; if (test4.success) results.passed++; else results.failed++;

  // Test 5: Partners Only
  log.section('TEST 5: Partners Only');
  const test5 = await testEndpoint('Partners', `${API_URL}/explore?source=partners&limit=10`);
  results.total++; if (test5.success) results.passed++; else results.failed++;

  // Test 6: Nearby Places
  log.section('TEST 6: Nearby Places');
  const test6 = await testEndpoint('Nearby', `${API_URL}/explore/nearby?lat=10.3458&lng=107.0843&radius=5000&limit=10`);
  results.total++; if (test6.success) results.passed++; else results.failed++;

  // Test 7: Categories
  log.section('TEST 7: Get Categories');
  const test7 = await testEndpoint('Categories', `${API_URL}/explore/categories`);
  results.total++; if (test7.success) results.passed++; else results.failed++;

  // Test 8: Featured Places
  log.section('TEST 8: Featured Places');
  const test8 = await testEndpoint('Featured', `${API_URL}/explore/featured?limit=5`);
  results.total++; if (test8.success) results.passed++; else results.failed++;

  // Test 9: Distance-Based
  log.section('TEST 9: Distance-Based Search');
  const test9 = await testEndpoint('Distance', `${API_URL}/explore?lat=10.3458&lng=107.0843&sort=distance&limit=10`);
  results.total++; if (test9.success) results.passed++; else results.failed++;

  // Test 10: Multiple Filters
  log.section('TEST 10: Multiple Filters');
  const test10 = await testEndpoint('Multi Filter', `${API_URL}/explore?city=Vũng Tàu&category=restaurant&minRating=4&limit=10`);
  results.total++; if (test10.success) results.passed++; else results.failed++;

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Tests: ${results.total}`);
  log.success(`Passed: ${results.passed}`);
  log.error(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log(`${'='.repeat(60)}\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});




