import pineconeService from './pinecone-service.js';
import googleMapsService from './googlemaps-service.js';
import cacheService from './cache-service.js';
import loggingService from './logging-service.js';

/**
 * =================================================================
 * Hybrid Search Service
 * =================================================================
 * Orchestrates searching from multiple data sources (Pinecone + Google Maps)
 * and provides a unified, ranked result set.
 * 
 * Main Responsibilities:
 * 1. Parallel querying of data sources.
 * 2. Normalizing data from each source into a standard format.
 * 3. Merging and ranking results based on business logic (e.g., partners first).
 * 4. Handling errors from individual data sources gracefully.
 * 5. (Future) Caching results for performance.
 * =================================================================
 */

/**
 * Performs a hybrid search for travel places.
 * 
 * @param {string} query - The user's search query (e.g., "nhà hàng hải sản ở Vũng Tàu").
 * @param {Object} options - Search options.
 * @param {number} [options.partnerLimit=2] - Max number of partner places to fetch.
 * @param {number} [options.googleLimit=5] - Max number of places to fetch from Google.
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const hybridSearch = async (query, options = {}) => {
  const startTime = Date.now();
  const { partnerLimit = 2, googleLimit = 5, location = null } = options;

  try {
    console.log(`🔍 Bắt đầu Hybrid Search cho: "${query}"`);

    // Check cache first
    const cacheKey = cacheService.generateKey(query, options);
    const cachedResult = cacheService.get(cacheKey);

    if (cachedResult) {
      loggingService.logCache({ operation: 'hit', key: cacheKey });
      loggingService.logSearch({
        query,
        success: true,
        cached: true,
        resultCount: cachedResult.data.results.length,
        duration: Date.now() - startTime
      });

      return {
        ...cachedResult,
        cached: true
      };
    }

    loggingService.logCache({ operation: 'miss', key: cacheKey });

    // Step 1: Parallel Querying with timing
    const pineconeStart = Date.now();
    const googleStart = Date.now();

    const [partnerResults, googleResults] = await Promise.allSettled([
      pineconeService.semanticSearch(query, {
        limit: partnerLimit,
        filter: { isPartner: { $eq: true } }
      }),
      location ?
        googleMapsService.searchNearbyPlaces(location, query, 10000) :
        googleMapsService.searchNearbyPlaces({ lat: 21.028511, lng: 105.804817 }, query, 10000)
    ]);

    // Log data source performance
    loggingService.logDataSource('pinecone', {
      operation: 'semantic_search',
      success: partnerResults.status === 'fulfilled' && partnerResults.value.success,
      duration: Date.now() - pineconeStart,
      error: partnerResults.status === 'rejected' ? partnerResults.reason?.message : null
    });

    loggingService.logDataSource('googleMaps', {
      operation: 'nearby_search',
      success: googleResults.status === 'fulfilled' && googleResults.value.success,
      duration: Date.now() - googleStart,
      error: googleResults.status === 'rejected' ? googleResults.reason?.message : null
    });

    // Step 2: Data Processing & Normalization
    const normalizedPartners = normalizePineconeResults(partnerResults);
    const normalizedGoogle = normalizeGoogleResults(googleResults);

    // Step 3: Merging & Ranking
    const finalResults = mergeAndRank(normalizedPartners, normalizedGoogle, location);

    const searchDuration = Date.now() - startTime;
    console.log(`✅ Hybrid Search hoàn tất. Tìm thấy ${finalResults.length} địa điểm trong ${searchDuration}ms.`);

    const result = {
      success: true,
      data: {
        query,
        results: finalResults,
        metadata: {
          partner_count: normalizedPartners.length,
          google_count: normalizedGoogle.length,
          total_count: finalResults.length,
          search_duration_ms: searchDuration,
          cached: false
        }
      }
    };

    // Cache successful results
    cacheService.set(cacheKey, result);

    // Log search operation
    loggingService.logSearch({
      query,
      success: true,
      cached: false,
      resultCount: finalResults.length,
      duration: searchDuration
    });

    return result;

  } catch (error) {
    const searchDuration = Date.now() - startTime;
    console.error('❌ Lỗi nghiêm trọng trong Hybrid Search:', error);

    // Log failed search
    loggingService.logSearch({
      query,
      success: false,
      cached: false,
      error: error.message,
      duration: searchDuration
    });

    return {
      success: false,
      message: `Lỗi Hybrid Search: ${error.message}`
    };
  }
};

// --- Helper Functions ---

/**
 * Normalizes results from Pinecone into a standard format.
 */
const normalizePineconeResults = (promiseResult) => {
  if (promiseResult.status === 'rejected' || !promiseResult.value.success) {
    console.warn('⚠️ Không thể lấy địa điểm đối tác từ Pinecone:', promiseResult.reason || promiseResult.value.message);
    return [];
  }
  return promiseResult.value.data.results.map(place => ({
    id: `pinecone_${place.id}`,
    source: 'partner',
    name: place.metadata.name,
    description: place.metadata.description,
    rating: place.metadata.rating,
    coordinates: {
      lat: place.metadata.latitude,
      lng: place.metadata.longitude
    },
    isPartner: true,
    raw: place // Keep original data if needed
  }));
};

/**
 * Normalizes results from Google Maps into a standard format.
 */
const normalizeGoogleResults = (promiseResult) => {
  if (promiseResult.status === 'rejected' || !promiseResult.value.success) {
    console.warn('⚠️ Không thể lấy địa điểm từ Google Maps:', promiseResult.reason || promiseResult.value.message);
    return [];
  }
  return promiseResult.value.data.map(place => ({
    id: `google_${place.place_id}`,
    source: 'google',
    name: place.name,
    description: place.vicinity,
    rating: place.rating,
    coordinates: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    },
    isPartner: false,
    raw: place // Keep original data if needed
  }));
};

/**
 * Merges and ranks results with advanced business logic.
 * Ranking priority: Partner places (by priority DESC) → Rating DESC → Distance ASC (if location available)
 */
const mergeAndRank = (partnerPlaces, googlePlaces, location = null) => {
  // Remove duplicates: if a partner place is also in Google results, remove it from Google's list.
  const partnerIds = new Set(partnerPlaces.map(p => p.name.toLowerCase()));
  const filteredGooglePlaces = googlePlaces.filter(p => !partnerIds.has(p.name.toLowerCase()));

  // Combine all places
  const allPlaces = [...partnerPlaces, ...filteredGooglePlaces];

  // Calculate final scores and sort
  const rankedPlaces = allPlaces.map(place => {
    let finalScore = 0;
    let scoreBreakdown = {
      partnerBonus: 0,
      priorityScore: 0,
      ratingScore: 0,
      distanceScore: 0
    };

    // 1. Partner bonus (highest priority)
    if (place.isPartner) {
      scoreBreakdown.partnerBonus = 1000; // Base partner bonus

      // 2. Priority score for partners (0-100 points)
      const priority = place.raw?.metadata?.priority || 1;
      scoreBreakdown.priorityScore = Math.max(0, 100 - (priority - 1) * 10); // Higher priority = higher score
    }

    // 3. Rating score (0-100 points)
    if (place.rating && place.rating > 0) {
      scoreBreakdown.ratingScore = (place.rating / 5) * 100;
    }

    // 4. Distance score (0-50 points, closer = higher score)
    if (location && place.coordinates) {
      const distance = calculateDistance(
        location.lat, location.lng,
        place.coordinates.lat, place.coordinates.lng
      );

      // Inverse distance scoring: closer places get higher scores
      // Max distance considered: 50km
      const maxDistance = 50000; // 50km in meters
      const normalizedDistance = Math.min(distance, maxDistance) / maxDistance;
      scoreBreakdown.distanceScore = (1 - normalizedDistance) * 50;
    }

    // Calculate final score
    finalScore = scoreBreakdown.partnerBonus +
                 scoreBreakdown.priorityScore +
                 scoreBreakdown.ratingScore +
                 scoreBreakdown.distanceScore;

    return {
      ...place,
      finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      scoreBreakdown: scoreBreakdown
    };
  });

  // Sort by final score (highest first)
  return rankedPlaces.sort((a, b) => b.finalScore - a.finalScore);
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export default {
  hybridSearch
};
