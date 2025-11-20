import dotenv from "dotenv";
dotenv.config();
import axios from 'axios';

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Geocoding will not work.');
    }
  }

  /**
   * Geocode an address to get coordinates
   * @param {string} address - The address to geocode
   * @returns {Promise<{lat: number, lng: number, formatted_address: string}>}
   */
  async geocodeAddress(address) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    if (!address || typeof address !== 'string') {
      throw new Error('Address is required and must be a string');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address: address.trim(),
          key: this.apiKey,
          language: 'vi' // Vietnamese language for Vietnam addresses
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.status !== 'OK') {
        if (response.data.status === 'ZERO_RESULTS') {
          throw new Error('No results found for the given address');
        }
        if (response.data.status === 'OVER_QUERY_LIMIT') {
          throw new Error('Google Maps API quota exceeded');
        }
        if (response.data.status === 'REQUEST_DENIED') {
          throw new Error('Google Maps API request denied');
        }
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      if (!result) {
        throw new Error('No geocoding results found');
      }

      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        types: result.types
      };
    } catch (error) {
      if (error.response) {
        throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Geocoding request timed out');
      }
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<{formatted_address: string, address_components: Array}>}
   */
  async reverseGeocode(lat, lng) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (lat < -90 || lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }

    if (lng < -180 || lng > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
          language: 'vi'
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        if (response.data.status === 'ZERO_RESULTS') {
          throw new Error('No address found for the given coordinates');
        }
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      if (!result) {
        throw new Error('No reverse geocoding results found');
      }

      return {
        formatted_address: result.formatted_address,
        address_components: result.address_components,
        place_id: result.place_id,
        types: result.types
      };
    } catch (error) {
      if (error.response) {
        throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Reverse geocoding request timed out');
      }
      throw error;
    }
  }

  /**
   * Get place details by place ID
   * @param {string} placeId - Google Places place ID
   * @returns {Promise<Object>}
   */
  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    if (!placeId || typeof placeId !== 'string') {
      throw new Error('Place ID is required and must be a string');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          key: this.apiKey,
          language: 'vi',
          fields: 'name,formatted_address,geometry,place_id,types,rating,user_ratings_total,opening_hours,formatted_phone_number,website'
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Place details failed: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Search for places by text query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async searchPlaces(query, options = {}) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required and must be a string');
    }

    try {
      const params = {
        query: query.trim(),
        key: this.apiKey,
        language: 'vi'
      };

      // Add optional parameters
      if (options.location) {
        params.location = `${options.location.lat},${options.location.lng}`;
      }
      if (options.radius) {
        params.radius = options.radius;
      }
      if (options.type) {
        params.type = options.type;
      }

      const response = await axios.get(`${this.baseUrl}/place/textsearch/json`, {
        params,
        timeout: 10000
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places search failed: ${response.data.status}`);
      }

      return response.data.results || [];
    } catch (error) {
      if (error.response) {
        throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Validate if coordinates are within Vietnam bounds (approximately)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean}
   */
  isWithinVietnam(lat, lng) {
    // Approximate bounds for Vietnam
    const vietnamBounds = {
      north: 23.4,
      south: 8.2,
      east: 109.5,
      west: 102.1
    };

    return lat >= vietnamBounds.south && 
           lat <= vietnamBounds.north && 
           lng >= vietnamBounds.west && 
           lng <= vietnamBounds.east;
  }
}

export default new GoogleMapsService();
