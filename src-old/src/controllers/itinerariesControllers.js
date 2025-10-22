import Itinerary from '../models/Itinerary.js';
import Trip from '../models/Trip.js';
import Destination from '../models/Destination.js';

export const getAllItineraries = async (req, res) => {
  try {
    const { tripId, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (tripId) query.tripId = tripId;
    
    const itineraries = await Itinerary.find(query)
      .populate('tripId', 'name startDate endDate')
      .populate('activities.destination', 'name location category images')
      .sort({ dayNumber: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Itinerary.countDocuments(query);
    
    res.status(200).json({
      itineraries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error calling getAllItineraries", error);
    res.status(500).json({ message: "Error fetching itineraries" });
  }
};

export const getItineraryById = async (req, res) => {
  try {
    const { id } = req.params;
    const itinerary = await Itinerary.findById(id)
      .populate('tripId', 'name startDate endDate userId')
      .populate('activities.destination', 'name location category images openingHours entranceFee');
      
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    res.status(200).json(itinerary);
  } catch (error) {
    console.error("Error calling getItineraryById", error);
    res.status(500).json({ message: "Error fetching itinerary" });
  }
};

export const getTripItineraries = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const itineraries = await Itinerary.find({ tripId })
      .populate('activities.destination', 'name location category images')
      .sort({ dayNumber: 1 });
    
    res.status(200).json(itineraries);
  } catch (error) {
    console.error("Error getting trip itineraries", error);
    res.status(500).json({ message: "Error fetching trip itineraries" });
  }
};

export const createItinerary = async (req, res) => {
  try {
    const itineraryData = req.body;
    
    // Validate required fields
    if (!itineraryData.tripId || !itineraryData.dayNumber || !itineraryData.date) {
      return res.status(400).json({ 
        message: "Missing required fields: tripId, dayNumber, date" 
      });
    }
    
    // Check if trip exists
    const trip = await Trip.findById(itineraryData.tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    // Check if itinerary for this day already exists
    const existingItinerary = await Itinerary.findOne({
      tripId: itineraryData.tripId,
      dayNumber: itineraryData.dayNumber
    });
    
    if (existingItinerary) {
      return res.status(400).json({ 
        message: "Itinerary for this day already exists" 
      });
    }
    
    const itinerary = new Itinerary(itineraryData);
    const newItinerary = await itinerary.save();
    
    // Add itinerary to trip
    trip.itinerary.push(newItinerary._id);
    await trip.save();
    
    const populatedItinerary = await Itinerary.findById(newItinerary._id)
      .populate('tripId', 'name startDate endDate')
      .populate('activities.destination');
    
    res.status(201).json(populatedItinerary);
    
  } catch (error) {
    console.error("Error calling createItinerary", error);
    res.status(500).json({ message: "Error creating itinerary" });
  }
};

export const updateItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const itinerary = await Itinerary.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    )
    .populate('tripId', 'name startDate endDate')
    .populate('activities.destination');
    
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    res.status(200).json(itinerary);
  } catch (error) {
    console.error("Error calling updateItinerary", error);
    res.status(500).json({ message: "Error updating itinerary" });
  }
};

export const deleteItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    
    const itinerary = await Itinerary.findByIdAndDelete(id);
    
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    // Remove itinerary from trip
    await Trip.findByIdAndUpdate(
      itinerary.tripId,
      { $pull: { itinerary: id } }
    );
    
    res.status(200).json({ message: "Itinerary deleted successfully" });
  } catch (error) {
    console.error("Error calling deleteItinerary", error);
    res.status(500).json({ message: "Error deleting itinerary" });
  }
};

export const addActivityToItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const activityData = req.body;
    
    const itinerary = await Itinerary.findById(id);
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    // Set order if not provided
    if (!activityData.order) {
      activityData.order = itinerary.activities.length + 1;
    }
    
    itinerary.activities.push(activityData);
    await itinerary.save();
    
    const updatedItinerary = await Itinerary.findById(id)
      .populate('activities.destination');
    
    res.status(200).json(updatedItinerary);
    
  } catch (error) {
    console.error("Error adding activity to itinerary", error);
    res.status(500).json({ message: "Error adding activity to itinerary" });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { id, activityId } = req.params;
    const updateData = req.body;
    
    const itinerary = await Itinerary.findById(id);
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    const activity = itinerary.activities.id(activityId);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }
    
    Object.assign(activity, updateData);
    await itinerary.save();
    
    const updatedItinerary = await Itinerary.findById(id)
      .populate('activities.destination');
    
    res.status(200).json(updatedItinerary);
    
  } catch (error) {
    console.error("Error updating activity", error);
    res.status(500).json({ message: "Error updating activity" });
  }
};

export const removeActivityFromItinerary = async (req, res) => {
  try {
    const { id, activityId } = req.params;
    
    const itinerary = await Itinerary.findById(id);
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    itinerary.activities.id(activityId).remove();
    await itinerary.save();
    
    const updatedItinerary = await Itinerary.findById(id)
      .populate('activities.destination');
    
    res.status(200).json(updatedItinerary);
    
  } catch (error) {
    console.error("Error removing activity from itinerary", error);
    res.status(500).json({ message: "Error removing activity from itinerary" });
  }
};

export const reorderActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { activityOrders } = req.body; // Array of { activityId, order }
    
    const itinerary = await Itinerary.findById(id);
    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    
    // Update order for each activity
    activityOrders.forEach(({ activityId, order }) => {
      const activity = itinerary.activities.id(activityId);
      if (activity) {
        activity.order = order;
      }
    });
    
    // Sort activities by order
    itinerary.activities.sort((a, b) => a.order - b.order);
    await itinerary.save();
    
    const updatedItinerary = await Itinerary.findById(id)
      .populate('activities.destination');
    
    res.status(200).json(updatedItinerary);
    
  } catch (error) {
    console.error("Error reordering activities", error);
    res.status(500).json({ message: "Error reordering activities" });
  }
};
