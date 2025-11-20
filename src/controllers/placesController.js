import Place from '../models/Place.js';
import googleMapsService from '../services/googlemaps-service.js';

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

// Create new place (Admin only)
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
      priceRange,
      location
    } = req.body;

    // Validate required fields
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name and address are required'
      });
    }

    let finalLocation = location;

    // Auto-geocode if location is not provided
    if (!location && address) {
      try {
        const geocodeResult = await googleMapsService.getCoordinates(address);
        finalLocation = {
          lat: geocodeResult.lat,
          lng: geocodeResult.lng
        };
        console.log(`Auto-geocoded address "${address}" to coordinates:`, finalLocation);
      } catch (geocodeError) {
        console.warn('Failed to geocode address:', geocodeError.message);
        // Continue without coordinates - not a fatal error
        finalLocation = null;
      }
    }

    // Create place data
    const placeData = {
      name,
      address,
      description,
      tags: tags || [],
      category: category || 'other',
      images: images || [],
      contact: contact || {},
      openingHours: openingHours || {},
      priceRange: priceRange || '$$',
      addedBy: req.user._id
    };

    // Only add location if it exists
    if (finalLocation && finalLocation.lat && finalLocation.lng) {
      placeData.location = finalLocation;
    }

    const place = new Place(placeData);
    await place.save();

    res.status(201).json({
      success: true,
      message: 'Place created successfully',
      data: place
    });
  } catch (error) {
    console.error('Create place error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create place'
    });
  }
};

// Update place (Admin only)
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

    // Auto-geocode if address is updated but location is not provided
    if (updateData.address && !updateData.location && updateData.address !== place.address) {
      try {
        const geocodeResult = await googleMapsService.getCoordinates(updateData.address);
        updateData.location = {
          type: 'Point',
          coordinates: [geocodeResult.lng, geocodeResult.lat],
          lat: geocodeResult.lat,
          lng: geocodeResult.lng
        };
        console.log(`Auto-geocoded updated address "${updateData.address}" to coordinates:`, updateData.location);
      } catch (geocodeError) {
        console.warn('Failed to geocode updated address:', geocodeError.message);
        // Continue without updating coordinates - not a fatal error
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

// Batch geocode places (Admin only)
export const batchGeocodePlaces = async (req, res) => {
  try {
    // Find places without coordinates
    const placesWithoutCoords = await Place.find({
      $or: [
        { 'location.lat': { $exists: false } },
        { 'location.lng': { $exists: false } },
        { location: null }
      ],
      address: { $exists: true, $ne: '' }
    });

    if (placesWithoutCoords.length === 0) {
      return res.json({
        success: true,
        message: 'All places already have coordinates',
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    // Process each place
    for (const place of placesWithoutCoords) {
      try {
        const geocodeResult = await googleMapsService.getCoordinates(place.address);

        // Update place with coordinates
        place.location = {
          type: 'Point',
          coordinates: [geocodeResult.lng, geocodeResult.lat],
          lat: geocodeResult.lat,
          lng: geocodeResult.lng
        };

        await place.save();

        results.push({
          placeId: place._id,
          name: place.name,
          address: place.address,
          status: 'success',
          coordinates: {
            lat: geocodeResult.lat,
            lng: geocodeResult.lng
          }
        });

        successful++;
        console.log(`Geocoded: ${place.name} - ${place.address}`);

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.push({
          placeId: place._id,
          name: place.name,
          address: place.address,
          status: 'failed',
          error: error.message
        });

        failed++;
        console.error(`Failed to geocode: ${place.name} - ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Batch geocoding completed. ${successful} successful, ${failed} failed.`,
      data: {
        processed: placesWithoutCoords.length,
        successful,
        failed,
        results
      }
    });
  } catch (error) {
    console.error('Batch geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform batch geocoding'
    });
  }
};

// Get places statistics
export const getPlacesStats = async (req, res) => {
  try {
    const totalPlaces = await Place.countDocuments();
    const activePlaces = await Place.countDocuments({ isActive: true });
    const placesWithCoords = await Place.countDocuments({
      'location.lat': { $exists: true },
      'location.lng': { $exists: true }
    });

    const categoryStats = await Place.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalPlaces,
        activePlaces,
        placesWithCoords,
        placesWithoutCoords: totalPlaces - placesWithCoords,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Get places stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get places statistics'
    });
  }
};
