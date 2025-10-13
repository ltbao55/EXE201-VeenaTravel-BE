import Place from "../models/Place.js";
import PartnerPlace from "../models/PartnerPlace.js";
import googlemapsService from "../services/googlemaps-service.js";
import hybridSearchService from "../services/hybrid-search-service.js";
import cacheService from "../services/cache-service.js";
import { getCoordinates, calculateDistance as calcDistance, isValidCoordinates } from "../utils/coordinate-helpers.js";

/**
 * =================================================================
 * EXPLORE CONTROLLER - ENHANCED VERSION
 * =================================================================
 * Unified Explore API combining:
 * 1. MongoDB Places (curated data)
 * 2. Partner Places (priority placement)
 * 3. Google Maps (real-time data)
 * 4. Smart filtering, sorting, caching
 * =================================================================
 */

/**
 * GET /api/explore
 * Fetch places for Explore screen with advanced filters
 * 
 * Query params:
 *  - page, limit: Pagination
 *  - city: City filter (e.g., "Vũng Tàu", "Hồ Chí Minh")
 *  - category: Category filter (restaurant|attraction|hotel|...)
 *  - q: Text search query
 *  - minRating: Minimum rating (0-5)
 *  - sort: Sorting (rating|recent|popular|distance)
 *  - lat, lng: User location for distance-based sorting
 *  - source: Data source (all|places|partners|google)
 *  - random: Random sampling (true|false)
 *  - maxDistance: Max distance in km (for location-based search)
 */
export const getExplorePlaces = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 100);
    const skip = (page - 1) * limit;

    const { 
      city, 
      category, 
      q, 
      minRating, 
      sort = 'recent',
      lat,
      lng,
      source = 'all',
      maxDistance = 50 // km
    } = req.query;
    
    const random = String(req.query.random || "false").toLowerCase() === "true";

    // Check cache first
    const cacheKey = `explore:${JSON.stringify({ page, limit, city, category, q, minRating, sort, lat, lng, source, random })}`;
    const cached = cacheService.get(cacheKey);
    
    if (cached) {
      console.log('🎯 Cache hit for explore query');
      return res.status(200).json({
        ...cached,
        cached: true
      });
    }

    // Build query based on source preference
    let items = [];
    let total = 0;
    let sources = { places: 0, partners: 0, google: 0 };

    // =============== STEP 1: Fetch from MongoDB Places ===============
    if (source === 'all' || source === 'places') {
      const placesResult = await fetchPlacesFromMongoDB({
        page, limit, skip, city, category, q, minRating, sort, random
      });
      items = items.concat(placesResult.items.map(p => ({ ...p, source: 'places', isPartner: false })));
      sources.places = placesResult.items.length;
      total += placesResult.total;
    }

    // =============== STEP 2: Fetch Partner Places (Priority) ===============
    if (source === 'all' || source === 'partners') {
      const partnersResult = await fetchPartnerPlaces({
        page, limit, city, category, q, minRating, sort
      });
      items = items.concat(partnersResult.items.map(p => ({ ...p, source: 'partners', isPartner: true })));
      sources.partners = partnersResult.items.length;
      total += partnersResult.total;
    }

    // =============== STEP 3: Fetch from Google Maps (Optional) ===============
    if ((source === 'all' || source === 'google') && lat && lng && city) {
      try {
        const googleResult = await fetchPlacesFromGoogleMaps({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          category,
          limit: Math.min(limit, 10)
        });
        items = items.concat(googleResult.items.map(p => ({ ...p, source: 'google', isPartner: false })));
        sources.google = googleResult.items.length;
      } catch (googleError) {
        console.warn('⚠️ Google Maps fetch failed:', googleError.message);
      }
    }

    // =============== STEP 4: Merge, Deduplicate & Sort ===============
    items = deduplicateItems(items);
    items = sortItems(items, sort, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null);

    // =============== STEP 5: Apply Distance Filter ===============
    if (lat && lng && maxDistance) {
      items = filterByDistance(items, parseFloat(lat), parseFloat(lng), parseFloat(maxDistance));
    }

    // =============== STEP 6: Pagination ===============
    const paginatedItems = items.slice(skip, skip + limit);

    // =============== STEP 7: Normalize Response Format ===============
    const mapped = paginatedItems.map(normalizeExploreItem);

    const response = {
      success: true,
      message: "Explore places fetched successfully",
      data: {
        items: mapped,
        pagination: {
          page,
          limit,
          total: items.length,
          totalPages: Math.ceil(items.length / limit),
          hasNextPage: skip + limit < items.length,
          hasPrevPage: page > 1
        },
        filters: { 
          city: city || null, 
          category: category || null, 
          q: q || null, 
          minRating: minRating ? Number(minRating) : null, 
          sort,
          location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
          source,
          random,
          maxDistance: maxDistance ? parseFloat(maxDistance) : null
        },
        sources,
        cached: false
      }
    };

    // Cache for 5 minutes
    cacheService.set(cacheKey, response, 5 * 60 * 1000);

    return res.status(200).json(response);

  } catch (error) {
    console.error("❌ Explore API error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch explore places",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/explore/nearby
 * Find nearby places based on user location with hybrid search
 */
export const getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, category, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude và longitude là bắt buộc'
      });
    }

    const location = {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    };

    // Use hybrid search for nearby places
    const searchQuery = category 
      ? `${category} near me` 
      : 'places near me';

    const result = await hybridSearchService.hybridSearch(searchQuery, {
      location,
      partnerLimit: Math.floor(limit * 0.3), // 30% partners
      googleLimit: Math.floor(limit * 0.7)   // 70% Google Maps
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Filter by radius
    const filteredResults = result.data.results
      .filter(place => {
        if (!place.coordinates) return false;
        const distance = calculateDistance(
          location.lat, location.lng,
          place.coordinates.lat, place.coordinates.lng
        );
        return distance <= parseFloat(radius);
      })
      .map(place => ({
        ...normalizeExploreItem(place),
        distance: calculateDistance(
          location.lat, location.lng,
          place.coordinates.lat, place.coordinates.lng
        )
      }));

    return res.status(200).json({
      success: true,
      message: 'Nearby places found successfully',
      data: {
        items: filteredResults,
        userLocation: location,
        radius: parseFloat(radius),
        total: filteredResults.length,
        metadata: result.data.metadata
      }
    });

  } catch (error) {
    console.error("❌ Nearby places error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby places"
    });
  }
};

/**
 * GET /api/explore/categories
 * Get available categories with counts
 */
export const getCategories = async (req, res) => {
  try {
    const { city } = req.query;

    // Build filter
    const filter = { isActive: true };
    if (city) {
      filter.address = { $regex: city, $options: "i" };
    }

    // Aggregate categories from Places
    const placesCategories = await Place.aggregate([
      { $match: filter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Aggregate categories from PartnerPlaces
    const partnerFilter = { status: 'active' };
    if (city) {
      partnerFilter.address = { $regex: city, $options: "i" };
    }

    const partnerCategories = await PartnerPlace.aggregate([
      { $match: partnerFilter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Merge categories
    const categoryMap = new Map();
    
    placesCategories.forEach(cat => {
      categoryMap.set(cat._id, (categoryMap.get(cat._id) || 0) + cat.count);
    });
    
    partnerCategories.forEach(cat => {
      categoryMap.set(cat._id, (categoryMap.get(cat._id) || 0) + cat.count);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data: {
        categories,
        total: categories.length,
        city: city || 'all'
      }
    });

  } catch (error) {
    console.error("❌ Categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    });
  }
};

/**
 * GET /api/explore/featured
 * Get featured/curated places (high rating, popular, or manually curated)
 */
export const getFeaturedPlaces = async (req, res) => {
  try {
    const { limit = 10, city, category } = req.query;

    const filter = { 
      isActive: true,
      "rating.average": { $gte: 4.0 } // Only high-rated
    };

    if (city) {
      filter.address = { $regex: city, $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    // Fetch from both sources
    const [places, partners] = await Promise.all([
      Place.find(filter)
        .sort({ "rating.count": -1, "rating.average": -1 })
        .limit(Math.floor(limit / 2))
        .lean(),
      PartnerPlace.find({ ...filter, status: 'active' })
        .sort({ priority: -1, rating: -1 })
        .limit(Math.ceil(limit / 2))
        .lean()
    ]);

    // Combine and normalize
    const items = [
      ...places.map(p => ({ ...p, source: 'places', isPartner: false })),
      ...partners.map(p => ({ ...p, source: 'partners', isPartner: true }))
    ];

    const mapped = items.map(normalizeExploreItem);

    return res.status(200).json({
      success: true,
      message: 'Featured places fetched successfully',
      data: {
        items: mapped,
        total: mapped.length,
        filters: { city: city || null, category: category || null }
      }
    });

  } catch (error) {
    console.error("❌ Featured places error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured places"
    });
  }
};

/**
 * GET /api/explore/:id
 * Get detailed information about a specific place
 */
export const getPlaceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { source = 'auto' } = req.query; // auto, places, partners

    let place = null;
    let placeSource = null;

    // Try to find in different sources
    if (source === 'auto' || source === 'places') {
      place = await Place.findOne({ _id: id, isActive: true }).lean();
      if (place) placeSource = 'places';
    }

    if (!place && (source === 'auto' || source === 'partners')) {
      place = await PartnerPlace.findOne({ _id: id, status: 'active' }).lean();
      if (place) placeSource = 'partners';
    }

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    // Normalize the response
    const normalized = normalizeExploreItem({
      ...place,
      source: placeSource,
      isPartner: placeSource === 'partners'
    });

    return res.status(200).json({
      success: true,
      message: 'Place details fetched successfully',
      data: normalized
    });

  } catch (error) {
    console.error("❌ Place details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place details"
    });
  }
};

// =============== HELPER FUNCTIONS ===============

/**
 * Fetch places from MongoDB Place collection
 */
const fetchPlacesFromMongoDB = async (options) => {
  const { page, limit, skip, city, category, q, minRating, sort, random } = options;

  const filter = { isActive: true };

  if (category) filter.category = category;
  if (city) filter.address = { $regex: city, $options: "i" };
  if (minRating) filter["rating.average"] = { $gte: Number(minRating) };

  let items;
  let total;

  if (random) {
    const pipeline = [];
    if (q) pipeline.push({ $match: { $text: { $search: q }, ...filter } });
    else pipeline.push({ $match: filter });
    pipeline.push({ $sample: { size: limit } });
    items = await Place.aggregate(pipeline);
    total = await Place.countDocuments(filter);
  } else {
    const query = q
      ? Place.find({ $text: { $search: q }, ...filter })
      : Place.find(filter);

    // Sorting
    if (sort === "rating") {
      query.sort({ "rating.average": -1, "rating.count": -1 });
    } else if (sort === "popular") {
      query.sort({ "rating.count": -1, "rating.average": -1 });
    } else {
      query.sort({ updatedAt: -1 });
    }

    const [docs, count] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      Place.countDocuments(filter)
    ]);
    items = docs;
    total = count;
  }

  return { items, total };
};

/**
 * Fetch partner places from MongoDB
 */
const fetchPartnerPlaces = async (options) => {
  const { page, limit, city, category, q, minRating, sort } = options;

  const filter = { status: 'active' };

  if (category) filter.category = category;
  if (city) filter.address = { $regex: city, $options: "i" };
  if (minRating) filter.rating = { $gte: Number(minRating) };
  if (q) filter.$text = { $search: q };

  const query = PartnerPlace.find(filter);

  // Sorting
  if (sort === "rating") {
    query.sort({ rating: -1, reviewCount: -1 });
  } else if (sort === "popular") {
    query.sort({ reviewCount: -1, rating: -1 });
  } else if (sort === "priority") {
    query.sort({ priority: -1, rating: -1 });
  } else {
    query.sort({ updatedAt: -1 });
  }

  const [items, total] = await Promise.all([
    query.limit(limit).lean(),
    PartnerPlace.countDocuments(filter)
  ]);

  return { items, total };
};

/**
 * Fetch places from Google Maps
 */
const fetchPlacesFromGoogleMaps = async (options) => {
  const { lat, lng, category, limit } = options;

  const result = await googlemapsService.searchNearbyPlaces(
    { lat, lng },
    category || null,
    10000 // 10km radius
  );

  if (!result.success) {
    return { items: [] };
  }

  const items = result.data.slice(0, limit).map(place => ({
    _id: place.place_id,
    name: place.name,
    description: place.vicinity,
    address: place.vicinity,
    location: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    },
    category: place.types ? place.types[0] : 'other',
    rating: {
      average: place.rating || 0,
      count: place.user_ratings_total || 0
    },
    images: place.photos || [],
    photoUrl: place.photos && place.photos[0] ? place.photos[0].url_medium : null,
    place_id: place.place_id
  }));

  return { items };
};

/**
 * Deduplicate items by name (case-insensitive)
 */
const deduplicateItems = (items) => {
  const seen = new Set();
  return items.filter(item => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Sort items based on criteria
 */
const sortItems = (items, sortBy, userLat, userLng) => {
  if (sortBy === 'distance' && userLat && userLng) {
    return items.sort((a, b) => {
      const distA = calculateDistance(userLat, userLng, a.location?.lat || 0, a.location?.lng || 0);
      const distB = calculateDistance(userLat, userLng, b.location?.lat || 0, b.location?.lng || 0);
      return distA - distB;
    });
  }

  if (sortBy === 'rating') {
    return items.sort((a, b) => {
      const ratingA = a.rating?.average || a.rating || 0;
      const ratingB = b.rating?.average || b.rating || 0;
      return ratingB - ratingA;
    });
  }

  if (sortBy === 'popular') {
    return items.sort((a, b) => {
      const countA = a.rating?.count || a.reviewCount || 0;
      const countB = b.rating?.count || b.reviewCount || 0;
      return countB - countA;
    });
  }

  // Default: Partners first, then by update time
  return items.sort((a, b) => {
    if (a.isPartner && !b.isPartner) return -1;
    if (!a.isPartner && b.isPartner) return 1;
    
    const timeA = new Date(a.updatedAt || a.createdAt || 0);
    const timeB = new Date(b.updatedAt || b.createdAt || 0);
    return timeB - timeA;
  });
};

/**
 * Filter items by distance
 */
const filterByDistance = (items, userLat, userLng, maxDistanceKm) => {
  return items.filter(item => {
    if (!item.location?.lat || !item.location?.lng) return false;
    const distance = calculateDistance(userLat, userLng, item.location.lat, item.location.lng);
    return distance <= maxDistanceKm * 1000; // Convert km to meters
  });
};

/**
 * Calculate distance between two coordinates (using helper)
 * Wrapper for backward compatibility
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  return calcDistance(lat1, lng1, lat2, lng2);
};

/**
 * Normalize explore item to consistent format
 * ✅ Always returns coordinates in {lat, lng} format for Frontend
 * Supports: GeoJSON, {lat, lng}, {latitude, longitude}, nested formats
 */
const normalizeExploreItem = (item) => {
  // Extract coordinates using helper (supports all formats)
  const coordinates = getCoordinates(item.location || item);
  
  // Validate coordinates
  const validCoords = coordinates && isValidCoordinates(coordinates.lat, coordinates.lng)
    ? coordinates
    : null;
  
  // Normalize photo URL selection
  const imageArray = Array.isArray(item.images) ? item.images : [];
  let normalizedPhotoUrl = item.photoUrl || item.thumbnail || null;
  if (imageArray.length > 0) {
    const firstImage = imageArray[0];
    if (typeof firstImage === 'string') {
      normalizedPhotoUrl = firstImage;
    } else if (firstImage && typeof firstImage === 'object') {
      // Prefer medium, then large, then small
      normalizedPhotoUrl = firstImage.url_medium || firstImage.url_large || firstImage.url_small || normalizedPhotoUrl;
    }
  }
  
  return {
    id: item._id || item.id,
    title: item.name || item.title,
    description: item.description,
    category: item.category,
    address: item.address,
    
    // ✅ Frontend-friendly format: {lat, lng}
    coordinates: validCoords,
    
    rating: {
      average: item.rating?.average || item.rating || 0,
      count: item.rating?.count || item.reviewCount || 0
    },
    tags: item.tags || [],
    images: imageArray,
    photoUrl: normalizedPhotoUrl,
    source: item.source || 'unknown',
    isPartner: item.isPartner || false,
    priority: item.priority || 1,
    priceRange: item.priceRange || null,
    contact: item.contact || null,
    openingHours: item.openingHours || null,
    amenities: item.amenities || [],
    place_id: item.place_id || null,
    addedAt: item.createdAt,
    updatedAt: item.updatedAt,
    distance: item.distance || null
  };
};

export default { 
  getExplorePlaces, 
  getNearbyPlaces,
  getCategories,
  getFeaturedPlaces,
  getPlaceDetails
};


