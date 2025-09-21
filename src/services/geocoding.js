import axios from 'axios';

class GeocodingService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  /**
   * Get coordinates (lat, lng) from address string
   * @param {string} address - Full address string
   * @returns {Promise<{lat: number, lng: number}>}
   */
  async getCoordinates(address) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key is not configured');
      }

      if (!address || typeof address !== 'string') {
        throw new Error('Valid address string is required');
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          address: address.trim(),
          key: this.apiKey,
          language: 'vi', // Vietnamese language preference
          region: 'vn'    // Vietnam region bias
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error('No results found for the provided address');
      }

      const location = response.data.results[0].geometry.location;
      
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: response.data.results[0].formatted_address,
        place_id: response.data.results[0].place_id
      };

    } catch (error) {
      console.error('Geocoding error:', error.message);
      
      if (error.response) {
        // API responded with error status
        throw new Error(`Geocoding API error: ${error.response.status} - ${error.response.data?.error_message || 'Unknown API error'}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error while calling Geocoding API');
      } else {
        // Other error
        throw error;
      }
    }
  }

  /**
   * Get address from coordinates (reverse geocoding)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>}
   */
  async getAddress(lat, lng) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key is not configured');
      }

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('Valid latitude and longitude numbers are required');
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
          language: 'vi',
          region: 'vn'
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error('No address found for the provided coordinates');
      }

      return response.data.results[0].formatted_address;

    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw error;
    }
  }

  /**
   * Batch geocode multiple addresses
   * @param {string[]} addresses - Array of address strings
   * @returns {Promise<Array<{address: string, coordinates: {lat: number, lng: number}, error?: string}>>}
   */
  async batchGeocode(addresses) {
    const results = [];
    
    for (const address of addresses) {
      try {
        const coordinates = await this.getCoordinates(address);
        results.push({
          address,
          coordinates: {
            lat: coordinates.lat,
            lng: coordinates.lng
          },
          formatted_address: coordinates.formatted_address
        });
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          address,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Validate if coordinates are within Vietnam bounds (approximately)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean}
   */
  isWithinVietnam(lat, lng) {
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
  }
}

// Export singleton instance
export default new GeocodingService();
