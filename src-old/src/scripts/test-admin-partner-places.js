/**
 * =================================================================
 * End-to-End Test Suite for Admin Partner Places Management
 * =================================================================
 * Tests the complete CRUD flow for partner places management:
 * 1. Add partner place
 * 2. Get all partner places
 * 3. Update partner place
 * 4. Deactivate partner place
 * 5. Delete partner place
 * 
 * Usage: node src/scripts/test-admin-partner-places.js
 * =================================================================
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/admin/partner-places`;

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds timeout for embedding operations
  retryAttempts: 3,
  retryDelay: 2000 // 2 seconds
};

// Test data
const TEST_PARTNER_PLACE = {
  name: 'Test Resort Paradise',
  description: 'Một resort sang trọng bên bờ biển với view tuyệt đẹp và dịch vụ 5 sao',
  latitude: 10.7769,
  longitude: 106.7009,
  category: 'resort',
  priority: 1,
  address: '123 Đường Biển, Vũng Tàu',
  phone: '+84 123 456 789',
  website: 'https://testresort.com',
  amenities: ['pool', 'spa', 'restaurant', 'beach_access']
};

const UPDATE_DATA = {
  name: 'Test Resort Paradise - Updated',
  description: 'Resort sang trọng đã được nâng cấp với nhiều tiện ích mới',
  priority: 2,
  amenities: ['pool', 'spa', 'restaurant', 'beach_access', 'gym', 'conference_room']
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

let createdPlaceId = null;

/**
 * Utility function to make HTTP requests with retry logic
 */
const makeRequest = async (method, url, data = null, retries = TEST_CONFIG.retryAttempts) => {
  try {
    const config = {
      method,
      url,
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNRESET' || error.response?.status >= 500)) {
      console.log(`⏳ Retrying request... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
      return makeRequest(method, url, data, retries - 1);
    }
    throw error;
  }
};

/**
 * Test helper functions
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

const validateResponse = (response, expectedFields = []) => {
  if (!response.success) {
    throw new Error(`API returned success: false - ${response.message}`);
  }

  if (expectedFields.length > 0 && response.data) {
    for (const field of expectedFields) {
      if (!(field in response.data)) {
        throw new Error(`Missing expected field: ${field}`);
      }
    }
  }

  return true;
};

/**
 * Test 1: Add Partner Place
 */
const testAddPartnerPlace = async () => {
  try {
    logTest('Test 1: Add Partner Place', 'RUNNING');
    
    const response = await makeRequest('POST', API_BASE, TEST_PARTNER_PLACE);
    
    validateResponse(response, ['id', 'name', 'message']);
    
    if (!response.data.id || !response.data.id.startsWith('partner_')) {
      throw new Error('Invalid partner place ID format');
    }

    createdPlaceId = response.data.id;
    logTest('Test 1: Add Partner Place', 'PASS', `Created place with ID: ${createdPlaceId}`);
    
    return response;
  } catch (error) {
    logTest('Test 1: Add Partner Place', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 2: Get All Partner Places
 */
const testGetAllPartnerPlaces = async () => {
  try {
    logTest('Test 2: Get All Partner Places', 'RUNNING');
    
    const response = await makeRequest('GET', `${API_BASE}?status=active&limit=50`);
    
    validateResponse(response, ['places', 'total', 'filters']);
    
    if (!Array.isArray(response.data.places)) {
      throw new Error('Places should be an array');
    }

    // Verify our created place is in the list
    const ourPlace = response.data.places.find(place => place.id === createdPlaceId);
    if (!ourPlace) {
      throw new Error('Created place not found in the list');
    }

    if (ourPlace.name !== TEST_PARTNER_PLACE.name) {
      throw new Error('Place name mismatch');
    }

    logTest('Test 2: Get All Partner Places', 'PASS', `Found ${response.data.places.length} places`);
    
    return response;
  } catch (error) {
    logTest('Test 2: Get All Partner Places', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 3: Update Partner Place
 */
const testUpdatePartnerPlace = async () => {
  try {
    logTest('Test 3: Update Partner Place', 'RUNNING');
    
    if (!createdPlaceId) {
      throw new Error('No place ID available for update test');
    }

    const response = await makeRequest('PUT', `${API_BASE}/${createdPlaceId}`, UPDATE_DATA);
    
    validateResponse(response, ['id', 'message']);
    
    if (response.data.id !== createdPlaceId) {
      throw new Error('Updated place ID mismatch');
    }

    logTest('Test 3: Update Partner Place', 'PASS', 'Place updated successfully');
    
    return response;
  } catch (error) {
    logTest('Test 3: Update Partner Place', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 4: Verify Update (Get updated place)
 */
const testVerifyUpdate = async () => {
  try {
    logTest('Test 4: Verify Update', 'RUNNING');
    
    const response = await makeRequest('GET', `${API_BASE}?status=active`);
    
    validateResponse(response, ['places']);
    
    const updatedPlace = response.data.places.find(place => place.id === createdPlaceId);
    if (!updatedPlace) {
      throw new Error('Updated place not found');
    }

    if (updatedPlace.name !== UPDATE_DATA.name) {
      throw new Error(`Name not updated. Expected: ${UPDATE_DATA.name}, Got: ${updatedPlace.name}`);
    }

    if (updatedPlace.priority !== UPDATE_DATA.priority) {
      throw new Error(`Priority not updated. Expected: ${UPDATE_DATA.priority}, Got: ${updatedPlace.priority}`);
    }

    logTest('Test 4: Verify Update', 'PASS', 'Update verification successful');
    
    return response;
  } catch (error) {
    logTest('Test 4: Verify Update', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 5: Deactivate Partner Place
 */
const testDeactivatePartnerPlace = async () => {
  try {
    logTest('Test 5: Deactivate Partner Place', 'RUNNING');
    
    if (!createdPlaceId) {
      throw new Error('No place ID available for deactivation test');
    }

    const response = await makeRequest('PATCH', `${API_BASE}/${createdPlaceId}/deactivate`);
    
    validateResponse(response, ['id', 'message']);
    
    if (response.data.id !== createdPlaceId) {
      throw new Error('Deactivated place ID mismatch');
    }

    logTest('Test 5: Deactivate Partner Place', 'PASS', 'Place deactivated successfully');
    
    return response;
  } catch (error) {
    logTest('Test 5: Deactivate Partner Place', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 6: Verify Deactivation
 */
const testVerifyDeactivation = async () => {
  try {
    logTest('Test 6: Verify Deactivation', 'RUNNING');
    
    // Check that place is not in active list
    const activeResponse = await makeRequest('GET', `${API_BASE}?status=active`);
    const activePlace = activeResponse.data.places.find(place => place.id === createdPlaceId);
    
    if (activePlace) {
      throw new Error('Deactivated place still appears in active list');
    }

    // Check that place is in inactive list
    const inactiveResponse = await makeRequest('GET', `${API_BASE}?status=inactive`);
    const inactivePlace = inactiveResponse.data.places.find(place => place.id === createdPlaceId);
    
    if (!inactivePlace) {
      throw new Error('Deactivated place not found in inactive list');
    }

    if (inactivePlace.status !== 'inactive') {
      throw new Error('Place status not set to inactive');
    }

    logTest('Test 6: Verify Deactivation', 'PASS', 'Deactivation verification successful');
    
    return inactiveResponse;
  } catch (error) {
    logTest('Test 6: Verify Deactivation', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 7: Delete Partner Place (Cleanup)
 */
const testDeletePartnerPlace = async () => {
  try {
    logTest('Test 7: Delete Partner Place', 'RUNNING');
    
    if (!createdPlaceId) {
      throw new Error('No place ID available for deletion test');
    }

    const response = await makeRequest('DELETE', `${API_BASE}/${createdPlaceId}`);
    
    validateResponse(response, ['id', 'message']);
    
    if (response.data.id !== createdPlaceId) {
      throw new Error('Deleted place ID mismatch');
    }

    logTest('Test 7: Delete Partner Place', 'PASS', 'Place deleted successfully');
    
    return response;
  } catch (error) {
    logTest('Test 7: Delete Partner Place', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Test 8: Verify Deletion
 */
const testVerifyDeletion = async () => {
  try {
    logTest('Test 8: Verify Deletion', 'RUNNING');
    
    // Check that place is not in any list
    const allResponse = await makeRequest('GET', `${API_BASE}?status=inactive`);
    const deletedPlace = allResponse.data.places.find(place => place.id === createdPlaceId);
    
    if (deletedPlace) {
      throw new Error('Deleted place still exists in database');
    }

    logTest('Test 8: Verify Deletion', 'PASS', 'Deletion verification successful');
    
    return allResponse;
  } catch (error) {
    logTest('Test 8: Verify Deletion', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Error Handling Tests
 */
const testErrorHandling = async () => {
  try {
    logTest('Test 9: Error Handling', 'RUNNING');
    
    // Test 1: Missing required fields
    try {
      await makeRequest('POST', API_BASE, { name: 'Incomplete Place' });
      throw new Error('Should have failed with missing required fields');
    } catch (error) {
      if (!error.response || error.response.status !== 400) {
        throw new Error('Should return 400 for missing required fields');
      }
    }

    // Test 2: Invalid place ID
    try {
      await makeRequest('PUT', `${API_BASE}/invalid-id`, UPDATE_DATA);
      throw new Error('Should have failed with invalid place ID');
    } catch (error) {
      if (!error.response || error.response.status !== 404) {
        throw new Error('Should return 404 for invalid place ID');
      }
    }

    // Test 3: Delete non-existent place
    try {
      await makeRequest('DELETE', `${API_BASE}/non-existent-id`);
      throw new Error('Should have failed with non-existent place ID');
    } catch (error) {
      if (!error.response || error.response.status !== 404) {
        throw new Error('Should return 404 for non-existent place ID');
      }
    }

    logTest('Test 9: Error Handling', 'PASS', 'All error cases handled correctly');
    
  } catch (error) {
    logTest('Test 9: Error Handling', 'FAIL', error.message);
    throw error;
  }
};

/**
 * Main test runner
 */
const runTests = async () => {
  console.log('🚀 Starting Admin Partner Places E2E Tests...\n');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`🔄 Retry attempts: ${TEST_CONFIG.retryAttempts}\n`);

  const startTime = Date.now();

  try {
    // Run tests in sequence
    await testAddPartnerPlace();
    await testGetAllPartnerPlaces();
    await testUpdatePartnerPlace();
    await testVerifyUpdate();
    await testDeactivatePartnerPlace();
    await testVerifyDeactivation();
    await testDeletePartnerPlace();
    await testVerifyDeletion();
    await testErrorHandling();

  } catch (error) {
    console.error('\n❌ Test suite stopped due to critical error:', error.message);
  }

  // Print results
  const duration = Date.now() - startTime;
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Unhandled error in test suite:', error);
    process.exit(1);
  });
}

export default {
  runTests,
  testResults
};
