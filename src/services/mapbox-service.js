import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';
import mbxMatrix from '@mapbox/mapbox-sdk/services/matrix.js';

// Initialize Mapbox clients
let geocodingClient = null;
let matrixClient = null;

// Initialize clients with token validation
const initializeClients = () => {
  const apiKey = process.env.MAPBOX_ACCESS_TOKEN;

  if (!apiKey) {
    throw new Error(`
Mapbox Access Token is not configured.

Please follow these steps from MAPBOX_SETUP_GUIDE.md:
1. Go to https://account.mapbox.com/
2. Get your Default public token or create new token "EXE201-Backend"
3. Add to .env file: MAPBOX_ACCESS_TOKEN=your_token_here
4. Restart server

Required scopes for EXE201 project:
- ✅ Geocoding API (search địa chỉ)
- ✅ Directions API (Matrix API)
- ✅ Maps API (nếu cần hiển thị bản đồ)
    `);
  }

  // Validate token format
  if (!apiKey.startsWith('pk.') && !apiKey.startsWith('sk.')) {
    throw new Error('Invalid Mapbox Access Token format. Tokens should start with "pk." (public) or "sk." (secret). Check MAPBOX_SETUP_GUIDE.md for details.');
  }

  // Validate JWT structure
  const tokenParts = apiKey.split('.');
  if (tokenParts.length < 3) {
    throw new Error('Invalid Mapbox Access Token structure. Token should be a valid JWT format. Please get a new token from https://account.mapbox.com/');
  }

  // Initialize clients
  geocodingClient = mbxGeocoding({ accessToken: apiKey });
  matrixClient = mbxMatrix({ accessToken: apiKey });

  console.log('✅ Mapbox service initialized successfully');

  if (apiKey.startsWith('sk.')) {
    console.warn('WARNING: Using secret token (sk.). For EXE201 project, public token (pk.) is sufficient and more secure.');
  } else {
    console.log('✅ Using public token (pk.) - suitable for EXE201 project requirements');
  }
};

// Ensure clients are initialized
const ensureInitialized = () => {
  if (!geocodingClient || !matrixClient) {
    initializeClients();
  }
};

/**
 * Get coordinates (lat, lng) from address string using Mapbox Geocoding API
 * @param {string} address - Full address string
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
export const getCoordinates = async (address) => {
  try {
    ensureInitialized();

    if (!address || typeof address !== 'string') {
      return {
        success: false,
        message: 'Valid address string is required'
      };
    }

    const response = await geocodingClient
      .forwardGeocode({
        query: address.trim(),
        limit: 1,
        language: ['vi'], // Vietnamese language preference
        country: ['vn'],  // Vietnam country bias
        autocomplete: false
      })
      .send();

    if (!response || !response.body || !response.body.features || response.body.features.length === 0) {
      return {
        success: false,
        message: 'No results found for the provided address'
      };
    }

    const feature = response.body.features[0];
    const [lng, lat] = feature.center;

    return {
      success: true,
      data: {
        lat: lat,
        lng: lng,
        formatted_address: feature.place_name,
        place_name: feature.place_name,
        context: feature.context || []
      }
    };

  } catch (error) {
    console.error('Mapbox Geocoding error:', error.message);

    // Enhanced error handling based on Mapbox documentation
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return {
          success: false,
          message: 'Invalid Mapbox Access Token. Please check your token configuration.'
        };
      } else if (status === 403) {
        return {
          success: false,
          message: 'Access denied. Your token may not have the required scopes for geocoding operations.'
        };
      } else if (status === 422) {
        return {
          success: false,
          message: 'Invalid request parameters. Please check your address format.'
        };
      } else if (status === 429) {
        return {
          success: false,
          message: 'Rate limit exceeded (600 requests/minute limit). Please wait before making more requests. See MAPBOX_SETUP_GUIDE.md for rate limits.'
        };
      } else {
        return {
          success: false,
          message: `Mapbox API error: ${status} - ${error.response.statusText}`
        };
      }
    } else if (error.request) {
      return {
        success: false,
        message: 'Network error while calling Mapbox API. Please check your internet connection.'
      };
    } else {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

/**
 * Get address from coordinates (reverse geocoding) using Mapbox Geocoding API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{success: boolean, data?: string, message?: string}>}
 */
export const getAddress = async (lat, lng) => {
  try {
    ensureInitialized();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return {
        success: false,
        message: 'Valid latitude and longitude numbers are required'
      };
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      return {
        success: false,
        message: 'Latitude must be between -90 and 90 degrees'
      };
    }
    if (lng < -180 || lng > 180) {
      return {
        success: false,
        message: 'Longitude must be between -180 and 180 degrees'
      };
    }

    const response = await geocodingClient
      .reverseGeocode({
        query: [lng, lat], // Mapbox expects [longitude, latitude]
        limit: 1,
        language: ['vi'],
        types: ['address', 'poi']
      })
      .send();

    if (!response || !response.body || !response.body.features || response.body.features.length === 0) {
      return {
        success: false,
        message: 'No address found for the provided coordinates'
      };
    }

    return {
      success: true,
      data: response.body.features[0].place_name
    };

  } catch (error) {
    console.error('Mapbox Reverse geocoding error:', error.message);

    // Enhanced error handling
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return {
          success: false,
          message: 'Invalid Mapbox Access Token for reverse geocoding.'
        };
      } else if (status === 403) {
        return {
          success: false,
          message: 'Access denied. Token may lack required scopes for reverse geocoding.'
        };
      } else if (status === 429) {
        return {
          success: false,
          message: 'Rate limit exceeded for reverse geocoding requests.'
        };
      }
    }
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Search for places using Mapbox Places API
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const searchPlaces = async (query, options = {}) => {
  try {
    ensureInitialized();

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        message: 'Valid search query is required'
      };
    }

    const response = await geocodingClient
      .forwardGeocode({
        query: query,
        limit: options.limit || 5,
        language: options.language || ['vi'],
        country: options.country || ['vn'],
        types: options.types || ['poi', 'address'],
        proximity: options.proximity || null,
        bbox: options.bbox || null
      })
      .send();

    if (!response || !response.body || !response.body.features) {
      return {
        success: true,
        data: []
      };
    }

    const places = response.body.features.map(feature => ({
      id: feature.id,
      place_name: feature.place_name,
      center: feature.center,
      geometry: feature.geometry,
      properties: feature.properties,
      context: feature.context || []
    }));

    return {
      success: true,
      data: places
    };

  } catch (error) {
    console.error('Mapbox Places search error:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get travel time and distance matrix between multiple coordinates using Mapbox Matrix API
 * @param {Array<Array<number>>} coordinates - Array of [longitude, latitude] pairs (2-25 coordinates)
 * @param {Object} options - Matrix API options
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const getMatrix = async (coordinates, options = {}) => {
  try {
    ensureInitialized();

    if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 25) {
      return {
        success: false,
        message: 'Coordinates must be an array of 2-25 coordinate pairs'
      };
    }

    // Validate coordinate format and ranges
    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i];
      if (!Array.isArray(coord) || coord.length !== 2 ||
          typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
        return {
          success: false,
          message: `Coordinate at index ${i} must be an array of [longitude, latitude] numbers`
        };
      }

      const [lng, lat] = coord;
      if (lat < -90 || lat > 90) {
        return {
          success: false,
          message: `Invalid latitude ${lat} at coordinate index ${i}. Must be between -90 and 90 degrees`
        };
      }
      if (lng < -180 || lng > 180) {
        return {
          success: false,
          message: `Invalid longitude ${lng} at coordinate index ${i}. Must be between -180 and 180 degrees`
        };
      }
    }

    const matrixOptions = {
      coordinates: coordinates,
      profile: options.profile || 'driving', // driving, walking, cycling, driving-traffic
      annotations: options.annotations || ['duration', 'distance'],
      ...options
    };

    const response = await matrixClient.getMatrix(matrixOptions).send();

    if (!response || !response.body) {
      return {
        success: false,
        message: 'Invalid response from Matrix API'
      };
    }

    return {
      success: true,
      data: {
        code: response.body.code,
        durations: response.body.durations,
        distances: response.body.distances,
        sources: response.body.sources,
        destinations: response.body.destinations
      }
    };

  } catch (error) {
    console.error('Mapbox Matrix API error:', error.message);

    // Enhanced error handling for Matrix API
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return {
          success: false,
          message: 'Invalid Mapbox Access Token for Matrix API.'
        };
      } else if (status === 403) {
        return {
          success: false,
          message: 'Access denied. Token may lack required scopes for Matrix API operations.'
        };
      } else if (status === 422) {
        return {
          success: false,
          message: 'Invalid Matrix API request. Check coordinates format and options.'
        };
      } else if (status === 429) {
        return {
          success: false,
          message: 'Rate limit exceeded for Matrix API requests.'
        };
      }
    }
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get travel time between two specific points
 * @param {Array<number>} origin - [longitude, latitude] of origin
 * @param {Array<number>} destination - [longitude, latitude] of destination
 * @param {string} profile - Travel profile (driving, walking, cycling, driving-traffic)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const getTravelTime = async (origin, destination, profile = 'driving') => {
  try {
    const matrixResult = await getMatrix([origin, destination], {
      profile,
      annotations: ['duration', 'distance']
    });

    if (!matrixResult.success) {
      return matrixResult;
    }

    const { durations, distances } = matrixResult.data;

    if (!durations || !durations[0] || durations[0][1] === null) {
      return {
        success: false,
        message: 'No route found between the specified points'
      };
    }

    return {
      success: true,
      data: {
        duration: durations[0][1], // seconds
        distance: distances[0][1], // meters
        durationMinutes: Math.round(durations[0][1] / 60),
        distanceKm: Math.round(distances[0][1] / 1000 * 100) / 100
      }
    };

  } catch (error) {
    console.error('Travel time calculation error:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Batch geocode multiple addresses using Mapbox
 * @param {string[]} addresses - Array of address strings
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const batchGeocode = async (addresses) => {
  try {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return {
        success: false,
        message: 'Valid array of addresses is required'
      };
    }

    const results = [];

    for (const address of addresses) {
      try {
        const coordinatesResult = await getCoordinates(address);

        if (coordinatesResult.success) {
          results.push({
            address,
            coordinates: {
              lat: coordinatesResult.data.lat,
              lng: coordinatesResult.data.lng
            },
            formatted_address: coordinatesResult.data.formatted_address,
            place_name: coordinatesResult.data.place_name
          });
        } else {
          results.push({
            address,
            error: coordinatesResult.message
          });
        }

        // Add delay to respect API rate limits (Mapbox allows 600 requests per minute)
        // Based on MAPBOX_SETUP_GUIDE.md: 600 requests/minute = 100ms delay
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.push({
          address,
          error: error.message
        });
      }
    }

    return {
      success: true,
      data: results
    };

  } catch (error) {
    console.error('Batch geocoding error:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Validate if coordinates are within Vietnam bounds (approximately)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
export const isWithinVietnam = (lat, lng) => {
  // Approximate bounds of Vietnam
  const vietnamBounds = {
    north: 23.393395,
    south: 8.179073,
    east: 109.464638,
    west: 102.144847
  };

  return lat >= vietnamBounds.south &&
         lat <= vietnamBounds.north &&
         lng >= vietnamBounds.west &&
         lng <= vietnamBounds.east;
};

/**
 * Get token information and validation status
 * @returns {Object} Token information
 */
export const getTokenInfo = () => {
  const apiKey = process.env.MAPBOX_ACCESS_TOKEN;

  if (!apiKey) {
    return {
      configured: false,
      type: null,
      valid: false,
      message: 'No token configured'
    };
  }

  const isPublic = apiKey.startsWith('pk.');
  const isSecret = apiKey.startsWith('sk.');
  const tokenParts = apiKey.split('.');

  return {
    configured: true,
    type: isPublic ? 'public' : isSecret ? 'secret' : 'unknown',
    valid: (isPublic || isSecret) && tokenParts.length >= 3,
    format: isPublic ? 'pk.xxx...' : isSecret ? 'sk.xxx...' : 'invalid',
    recommendation: isPublic
      ? 'Public token - suitable for EXE201 project with Geocoding/Directions API access'
      : isSecret
      ? 'Secret token - keep secure, never expose to client-side code'
      : 'Invalid token format - must start with pk. or sk.',
    scopes: isPublic
      ? 'Read access to Geocoding API, Directions API, Maps API (as per MAPBOX_SETUP_GUIDE.md)'
      : 'Full access depending on token configuration'
  };
};

// Default export for backward compatibility with existing imports
const geocodingService = {
  getCoordinates,
  getAddress,
  searchPlaces,
  getMatrix,
  getTravelTime,
  batchGeocode,
  isWithinVietnam,
  getTokenInfo
};

export default geocodingService;
