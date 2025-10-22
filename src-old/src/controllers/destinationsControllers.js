import Destination from '../models/Destination.js';
import Review from '../models/Review.js';

export const getAllDestinations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      city, 
      province, 
      region,
      isPopular,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = { isActive: true };
    
    // Apply filters
    if (category) query.category = category;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (province) query['location.province'] = { $regex: province, $options: 'i' };
    if (region) query['location.region'] = region;
    if (isPopular !== undefined) query.isPopular = isPopular === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const destinations = await Destination.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Destination.countDocuments(query);
    
    res.status(200).json({
      destinations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error calling getAllDestinations", error);
    res.status(500).json({ message: "Error fetching destinations" });
  }
};

export const getDestinationById = async (req, res) => {
  try {
    const { id } = req.params;
    const destination = await Destination.findById(id)
      .populate('nearbyDestinations.destination', 'name location category images rating');
      
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }
    
    // Increment view count
    destination.viewCount += 1;
    await destination.save();
    
    res.status(200).json(destination);
  } catch (error) {
    console.error("Error calling getDestinationById", error);
    res.status(500).json({ message: "Error fetching destination" });
  }
};

export const createDestination = async (req, res) => {
  try {
    const destinationData = req.body;
    
    // Validate required fields
    if (!destinationData.name || !destinationData.description || 
        !destinationData.location || !destinationData.category) {
      return res.status(400).json({ 
        message: "Missing required fields: name, description, location, category" 
      });
    }
    
    const destination = new Destination(destinationData);
    const newDestination = await destination.save();
    
    res.status(201).json(newDestination);
    
  } catch (error) {
    console.error("Error calling createDestination", error);
    res.status(500).json({ message: "Error creating destination" });
  }
};

export const updateDestination = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const destination = await Destination.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }
    
    res.status(200).json(destination);
  } catch (error) {
    console.error("Error calling updateDestination", error);
    res.status(500).json({ message: "Error updating destination" });
  }
};

export const deleteDestination = async (req, res) => {
  try {
    const { id } = req.params;
    
    const destination = await Destination.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }
    
    res.status(200).json({ message: "Destination deactivated successfully" });
  } catch (error) {
    console.error("Error calling deleteDestination", error);
    res.status(500).json({ message: "Error deleting destination" });
  }
};

export const getDestinationsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }
    
    const destinations = await Destination.find({
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).limit(20);
    
    res.status(200).json(destinations);
  } catch (error) {
    console.error("Error getting destinations by location", error);
    res.status(500).json({ message: "Error fetching nearby destinations" });
  }
};

export const getPopularDestinations = async (req, res) => {
  try {
    const { limit = 10, region } = req.query;
    const query = { isPopular: true, isActive: true };
    
    if (region) query['location.region'] = region;
    
    const destinations = await Destination.find(query)
      .sort({ 'rating.average': -1, viewCount: -1 })
      .limit(parseInt(limit));
    
    res.status(200).json(destinations);
  } catch (error) {
    console.error("Error getting popular destinations", error);
    res.status(500).json({ message: "Error fetching popular destinations" });
  }
};

export const getDestinationReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt' } = req.query;
    
    const reviews = await Review.find({ 
      destination: id, 
      status: 'approved' 
    })
    .populate('user', 'name avatar')
    .sort({ [sortBy]: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const total = await Review.countDocuments({ 
      destination: id, 
      status: 'approved' 
    });
    
    res.status(200).json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error getting destination reviews", error);
    res.status(500).json({ message: "Error fetching destination reviews" });
  }
};

export const searchDestinations = async (req, res) => {
  try {
    const { q, category, region, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }
    
    const query = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { 'location.city': { $regex: q, $options: 'i' } },
        { 'location.province': { $regex: q, $options: 'i' } }
      ]
    };
    
    if (category) query.category = category;
    if (region) query['location.region'] = region;
    
    const destinations = await Destination.find(query)
      .sort({ 'rating.average': -1, viewCount: -1 })
      .limit(parseInt(limit));
    
    res.status(200).json(destinations);
  } catch (error) {
    console.error("Error searching destinations", error);
    res.status(500).json({ message: "Error searching destinations" });
  }
};
