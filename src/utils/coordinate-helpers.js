/**
 * =================================================================
 * COORDINATE HELPERS
 * =================================================================
 * Utilities for working with coordinates in different formats
 * Supports: GeoJSON, {lat, lng}, {latitude, longitude}
 * =================================================================
 */

/**
 * Extract latitude from any coordinate format
 * @param {Object} location - Location object in any format
 * @returns {number|null} Latitude
 */
export const getLatitude = (location) => {
  if (!location) return null;
  
  // Format 1: {lat: number}
  if (typeof location.lat === 'number') {
    return location.lat;
  }
  
  // Format 2: {latitude: number}
  if (typeof location.latitude === 'number') {
    return location.latitude;
  }
  
  // Format 3: GeoJSON {coordinates: [lng, lat]}
  if (location.coordinates && Array.isArray(location.coordinates)) {
    return location.coordinates[1]; // Latitude is second in GeoJSON
  }
  
  // Format 4: Nested {geo: {coordinates: [lng, lat]}}
  if (location.geo && location.geo.coordinates && Array.isArray(location.geo.coordinates)) {
    return location.geo.coordinates[1];
  }
  
  // Format 5: Nested {coordinates: {latitude: number}}
  if (location.coordinates && typeof location.coordinates.latitude === 'number') {
    return location.coordinates.latitude;
  }
  
  return null;
};

/**
 * Extract longitude from any coordinate format
 * @param {Object} location - Location object in any format
 * @returns {number|null} Longitude
 */
export const getLongitude = (location) => {
  if (!location) return null;
  
  // Format 1: {lng: number}
  if (typeof location.lng === 'number') {
    return location.lng;
  }
  
  // Format 2: {longitude: number}
  if (typeof location.longitude === 'number') {
    return location.longitude;
  }
  
  // Format 3: GeoJSON {coordinates: [lng, lat]}
  if (location.coordinates && Array.isArray(location.coordinates)) {
    return location.coordinates[0]; // Longitude is first in GeoJSON
  }
  
  // Format 4: Nested {geo: {coordinates: [lng, lat]}}
  if (location.geo && location.geo.coordinates && Array.isArray(location.geo.coordinates)) {
    return location.geo.coordinates[0];
  }
  
  // Format 5: Nested {coordinates: {longitude: number}}
  if (location.coordinates && typeof location.coordinates.longitude === 'number') {
    return location.coordinates.longitude;
  }
  
  return null;
};

/**
 * Get coordinates in {lat, lng} format (Frontend-friendly)
 * @param {Object} location - Location object in any format
 * @returns {Object|null} {lat: number, lng: number} or null
 */
export const getCoordinates = (location) => {
  const lat = getLatitude(location);
  const lng = getLongitude(location);
  
  if (lat === null || lng === null) {
    return null;
  }
  
  return { lat, lng };
};

/**
 * Convert coordinates to GeoJSON format (MongoDB-friendly)
 * @param {number|Object} lat - Latitude or location object
 * @param {number} lng - Longitude (if lat is number)
 * @returns {Object} GeoJSON Point format
 */
export const toGeoJSON = (lat, lng) => {
  // If first param is an object
  if (typeof lat === 'object' && lat !== null) {
    const coords = getCoordinates(lat);
    if (!coords) {
      throw new Error('Invalid location object');
    }
    return {
      type: 'Point',
      coordinates: [coords.lng, coords.lat]
    };
  }
  
  // If separate lat, lng params
  if (typeof lat === 'number' && typeof lng === 'number') {
    return {
      type: 'Point',
      coordinates: [lng, lat]
    };
  }
  
  throw new Error('Invalid coordinates');
};

/**
 * Validate coordinates
 * @param {number|Object} lat - Latitude or location object
 * @param {number} lng - Longitude (if lat is number)
 * @returns {boolean} True if valid
 */
export const isValidCoordinates = (lat, lng) => {
  // If first param is an object
  if (typeof lat === 'object' && lat !== null) {
    const coords = getCoordinates(lat);
    if (!coords) return false;
    return isValidCoordinates(coords.lat, coords.lng);
  }
  
  // If separate lat, lng params
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  
  if (lat < -90 || lat > 90) {
    return false;
  }
  
  if (lng < -180 || lng > 180) {
    return false;
  }
  
  return true;
};

/**
 * Calculate distance between two points (Haversine formula)
 * @param {Object|number} point1 - First point {lat, lng} or latitude
 * @param {Object|number} point2OrLng - Second point {lat, lng} or longitude of point1
 * @param {number} lat2 - Latitude of point2 (if using separate params)
 * @param {number} lng2 - Longitude of point2 (if using separate params)
 * @returns {number} Distance in meters
 */
export const calculateDistance = (point1, point2OrLng, lat2, lng2) => {
  let coords1, coords2;
  
  // Parse coordinates
  if (typeof point1 === 'object') {
    coords1 = getCoordinates(point1);
    coords2 = getCoordinates(point2OrLng);
  } else {
    coords1 = { lat: point1, lng: point2OrLng };
    coords2 = { lat: lat2, lng: lng2 };
  }
  
  if (!coords1 || !coords2) {
    throw new Error('Invalid coordinates for distance calculation');
  }
  
  const R = 6371000; // Earth's radius in meters
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coords1.lat * Math.PI / 180) * 
            Math.cos(coords2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @param {string} locale - Locale for formatting (default: 'vi-VN')
 * @returns {string} Formatted distance
 */
export const formatDistance = (meters, locale = 'vi-VN') => {
  if (typeof meters !== 'number' || isNaN(meters)) {
    return 'N/A';
  }
  
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  
  const km = meters / 1000;
  if (locale === 'vi-VN') {
    return `${km.toFixed(1)} km`;
  }
  
  return `${km.toFixed(1)} km`;
};

/**
 * Create bounding box around a point
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} {north, south, east, west}
 */
export const getBoundingBox = (lat, lng, radiusKm) => {
  const latRadian = lat * Math.PI / 180;
  const degLat = radiusKm / 110.574; // 1 degree latitude ≈ 110.574 km
  const degLng = radiusKm / (111.320 * Math.cos(latRadian)); // 1 degree longitude varies by latitude
  
  return {
    north: lat + degLat,
    south: lat - degLat,
    east: lng + degLng,
    west: lng - degLng
  };
};

/**
 * Check if point is within bounding box
 * @param {Object} point - Point {lat, lng}
 * @param {Object} bbox - Bounding box {north, south, east, west}
 * @returns {boolean} True if point is within bbox
 */
export const isWithinBounds = (point, bbox) => {
  const coords = getCoordinates(point);
  if (!coords) return false;
  
  return coords.lat >= bbox.south &&
         coords.lat <= bbox.north &&
         coords.lng >= bbox.west &&
         coords.lng <= bbox.east;
};

/**
 * Get center point of multiple coordinates
 * @param {Array<Object>} points - Array of points with coordinates
 * @returns {Object|null} Center point {lat, lng}
 */
export const getCenterPoint = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }
  
  const validPoints = points
    .map(p => getCoordinates(p))
    .filter(c => c !== null);
  
  if (validPoints.length === 0) {
    return null;
  }
  
  const sumLat = validPoints.reduce((sum, p) => sum + p.lat, 0);
  const sumLng = validPoints.reduce((sum, p) => sum + p.lng, 0);
  
  return {
    lat: sumLat / validPoints.length,
    lng: sumLng / validPoints.length
  };
};

export default {
  getLatitude,
  getLongitude,
  getCoordinates,
  toGeoJSON,
  isValidCoordinates,
  calculateDistance,
  formatDistance,
  getBoundingBox,
  isWithinBounds,
  getCenterPoint
};



