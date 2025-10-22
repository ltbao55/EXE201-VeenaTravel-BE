/**
 * =================================================================
 * Cache Service
 * =================================================================
 * Provides caching functionality for hybrid search results.
 * Uses in-memory cache with TTL (Time To Live) for performance optimization.
 * In production, this should be replaced with Redis or similar.
 * =================================================================
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes default TTL
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Generate cache key from search parameters
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {string} - Cache key
   */
  generateKey(query, options = {}) {
    const keyData = {
      query: query.toLowerCase().trim(),
      partnerLimit: options.partnerLimit || 2,
      googleLimit: options.googleLimit || 5,
      location: options.location || null
    };
    
    return `hybrid_search:${JSON.stringify(keyData)}`;
  }

  /**
   * Get cached result
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached data or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`🎯 Cache hit: ${key}`);
    entry.hits = (entry.hits || 0) + 1;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} customTtl - Custom TTL in milliseconds
   */
  set(key, data, customTtl = null) {
    const ttlToUse = customTtl || this.ttl;
    const entry = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlToUse,
      hits: 0,
      lastAccessed: Date.now()
    };
    
    this.cache.set(key, entry);
    console.log(`💾 Cached: ${key} (TTL: ${ttlToUse}ms)`);
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache cleared: ${size} entries removed`);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: ${cleanedCount} expired entries removed`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      total_entries: this.cache.size,
      expired_entries: entries.filter(entry => now > entry.expiresAt).length,
      active_entries: entries.filter(entry => now <= entry.expiresAt).length,
      total_hits: entries.reduce((sum, entry) => sum + (entry.hits || 0), 0),
      memory_usage_mb: Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024 / 1024 * 100) / 100,
      oldest_entry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.createdAt))).toISOString() : null,
      newest_entry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.createdAt))).toISOString() : null
    };
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string} pattern - Pattern to match (simple string contains)
   */
  invalidatePattern(pattern) {
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    console.log(`🔄 Cache invalidated: ${invalidatedCount} entries matching "${pattern}"`);
    return invalidatedCount;
  }
}

// Create singleton instance
const cacheService = new CacheService();

/**
 * Wrapper function for caching hybrid search results
 * @param {Function} searchFunction - The search function to cache
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results (cached or fresh)
 */
const withCache = async (searchFunction, query, options = {}) => {
  const cacheKey = cacheService.generateKey(query, options);
  
  // Try to get from cache first
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    return {
      ...cachedResult,
      cached: true,
      cache_hit: true
    };
  }
  
  // Execute search function
  console.log(`🔍 Cache miss, executing search: ${query}`);
  const result = await searchFunction(query, options);
  
  // Cache successful results
  if (result.success) {
    cacheService.set(cacheKey, {
      ...result,
      cached: false,
      cache_hit: false
    });
  }
  
  return {
    ...result,
    cached: false,
    cache_hit: false
  };
};

/**
 * ✅ Generate cache key for geocoding results
 * @param {string} address - Location address
 * @returns {string} - Cache key
 */
const generateGeocodingKey = (address) => {
  return `geocode:${address.toLowerCase().trim()}`;
};

/**
 * ✅ Cache geocoding result with 7 days TTL
 * @param {string} address - Location address
 * @param {Object} geocodedData - Geocoded location data
 */
const cacheGeocodingResult = (address, geocodedData) => {
  const key = generateGeocodingKey(address);
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  cacheService.set(key, geocodedData, SEVEN_DAYS);
  console.log(`📍 Geocoding cached: ${address} (TTL: 7 days)`);
};

/**
 * ✅ Get cached geocoding result
 * @param {string} address - Location address
 * @returns {Object|null} - Cached geocoded data or null
 */
const getCachedGeocodingResult = (address) => {
  const key = generateGeocodingKey(address);
  const cached = cacheService.get(key);
  
  if (cached) {
    console.log(`📍 Geocoding cache hit: ${address}`);
  }
  
  return cached;
};

export default {
  get: cacheService.get.bind(cacheService),
  set: cacheService.set.bind(cacheService),
  delete: cacheService.delete.bind(cacheService),
  clear: cacheService.clear.bind(cacheService),
  cleanup: cacheService.cleanup.bind(cacheService),
  getStats: cacheService.getStats.bind(cacheService),
  invalidatePattern: cacheService.invalidatePattern.bind(cacheService),
  generateKey: cacheService.generateKey.bind(cacheService),
  withCache,
  // ✅ Geocoding cache methods (7 days TTL)
  generateGeocodingKey,
  cacheGeocodingResult,
  getCachedGeocodingResult
};
