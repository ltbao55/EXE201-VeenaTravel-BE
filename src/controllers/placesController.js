import Place from '../models/Place.js';
import geocodingService from '../services/geocoding.js';

// Get all places
export const getAllPlaces = async (req, res) => {
  try {
    const { 
      category, 
      tags, 
      search, 
      isActive, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = {};
    
    // Filter by category
    if (category) {
      filter.category = category;
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Text search
    if (search) {
      filter.$text = { $search: search };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const places = await Place.find(filter)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Place.countDocuments(filter);
    
    res.json({
      success: true,
      data: places,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all places error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places'
    });
  }
};

// Get place by ID
export const getPlaceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const place = await Place.findById(id)
      .populate('addedBy', 'name email');
    
    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }
    
    res.json({
      success: true,
      data: place
    });
  } catch (error) {
    console.error('Get place by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch place'
    });
  }
};

// Create new place (Admin only) - with automatic geocoding
export const createPlace = async (req, res) => {
  try {
    const {
      name,
      address,
      description,
      tags,
      category,
      images,
      contact,
      openingHours,
      priceRange
    } = req.body;

    // Validate required fields
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name and address are required'
      });
    }

    // Get coordinates from Google Geocoding API
    let coordinates;
    try {
      coordinates = await geocodingService.getCoordinates(address);
    } catch (geocodingError) {
      return res.status(400).json({
        success: false,
        message: `Failed to get coordinates: ${geocodingError.message}`
      });
    }

    // Create place with coordinates
    const place = new Place({
      name,
      address,
      description,
      tags: tags || [],
      category: category || 'other',
      location: {
        lat: coordinates.lat,
        lng: coordinates.lng
      },
      images: images || [],
      contact: contact || {},
      openingHours: openingHours || {},
      priceRange: priceRange || '$$',
      addedBy: req.user._id
    });

    await place.save();

    res.status(201).json({
      success: true,
      message: 'Place created successfully with coordinates',
      data: place,
      geocoding: {
        formatted_address: coordinates.formatted_address,
        coordinates: {
          lat: coordinates.lat,
          lng: coordinates.lng
        }
      }
    });
  } catch (error) {
    console.error('Create place error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create place'
    });
  }
};

// Update place (Admin only) - re-geocode if address changed
export const updatePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if place exists
    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // If address is being updated, get new coordinates
    if (updateData.address && updateData.address !== place.address) {
      try {
        const coordinates = await geocodingService.getCoordinates(updateData.address);
        updateData.location = {
          lat: coordinates.lat,
          lng: coordinates.lng
        };
      } catch (geocodingError) {
        return res.status(400).json({
          success: false,
          message: `Failed to get coordinates for new address: ${geocodingError.message}`
        });
      }
    }

    // Update place
    Object.assign(place, updateData);
    await place.save();

    res.json({
      success: true,
      message: 'Place updated successfully',
      data: place
    });
  } catch (error) {
    console.error('Update place error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update place'
    });
  }
};

// Delete place (Admin only)
export const deletePlace = async (req, res) => {
  try {
    const { id } = req.params;

    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    await Place.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Place deleted successfully'
    });
  } catch (error) {
    console.error('Delete place error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete place'
    });
  }
};

// Search places by location (within radius)
export const searchPlacesByLocation = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Convert radius from km to radians (divide by Earth's radius in km)
    const radiusInRadians = parseFloat(radius) / 6371;

    const places = await Place.find({
      location: {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInRadians]
        }
      },
      isActive: true
    }).populate('addedBy', 'name email');

    res.json({
      success: true,
      data: places,
      count: places.length,
      searchParams: {
        center: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: parseFloat(radius)
      }
    });
  } catch (error) {
    console.error('Search places by location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search places by location'
    });
  }
};

// Batch geocode places without coordinates
export const batchGeocodePlaces = async (req, res) => {
  try {
    // Find places without coordinates
    const placesWithoutCoords = await Place.find({
      $or: [
        { location: { $exists: false } },
        { 'location.lat': { $exists: false } },
        { 'location.lng': { $exists: false } }
      ]
    });

    if (placesWithoutCoords.length === 0) {
      return res.json({
        success: true,
        message: 'All places already have coordinates',
        processed: 0
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const place of placesWithoutCoords) {
      try {
        const coordinates = await geocodingService.getCoordinates(place.address);
        
        place.location = {
          lat: coordinates.lat,
          lng: coordinates.lng
        };
        
        await place.save();
        
        results.push({
          placeId: place._id,
          name: place.name,
          success: true,
          coordinates: coordinates
        });
        
        successCount++;
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        results.push({
          placeId: place._id,
          name: place.name,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Batch geocoding completed. ${successCount} successful, ${errorCount} failed.`,
      processed: placesWithoutCoords.length,
      successCount,
      errorCount,
      results
    });
  } catch (error) {
    console.error('Batch geocode places error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch geocode places'
    });
  }
};
