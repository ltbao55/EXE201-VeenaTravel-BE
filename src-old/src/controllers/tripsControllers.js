import Trip from '../models/Trip.js';
import Destination from '../models/Destination.js';
import Itinerary from '../models/Itinerary.js';

export const getAllTrips = async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (status) query.status = status;

    const trips = await Trip.find(query)
      .populate('destinations', 'name location category images')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Trip.countDocuments(query);

    res.status(200).json({
      trips,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error calling getAllTrips", error);
    res.status(500).json({ message: "Error fetching trips" });
  }
};

export const getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id)
      .populate('destinations')
      .populate('itinerary')
      .populate('userId', 'name email avatar');

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error calling getTripById", error);
    res.status(500).json({ message: "Error fetching trip" });
  }
};

export const createTrip = async (req, res) => {
  try {
    const tripData = req.body;

    // Validate required fields
    if (!tripData.name || !tripData.description || !tripData.userId || !tripData.startDate || !tripData.endDate) {
      return res.status(400).json({
        message: "Missing required fields: name, description, userId, startDate, endDate"
      });
    }

    const trip = new Trip(tripData);
    const newTrip = await trip.save();

    // Populate the response
    const populatedTrip = await Trip.findById(newTrip._id)
      .populate('userId', 'name email')
      .populate('destinations');

    res.status(201).json(populatedTrip);

  } catch (error) {
    console.error("Error calling createTrip", error);
    res.status(500).json({ message: "Error creating trip" });
  }
};

export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const trip = await Trip.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('destinations')
    .populate('userId', 'name email');

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error calling updateTrip", error);
    res.status(500).json({ message: "Error updating trip" });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findByIdAndDelete(id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Also delete related itineraries
    await Itinerary.deleteMany({ tripId: id });

    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error calling deleteTrip", error);
    res.status(500).json({ message: "Error deleting trip" });
  }
};

export const addDestinationToTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { destinationId } = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const destination = await Destination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    if (!trip.destinations.includes(destinationId)) {
      trip.destinations.push(destinationId);
      await trip.save();
    }

    const updatedTrip = await Trip.findById(id).populate('destinations');
    res.status(200).json(updatedTrip);

  } catch (error) {
    console.error("Error adding destination to trip", error);
    res.status(500).json({ message: "Error adding destination to trip" });
  }
};

export const removeDestinationFromTrip = async (req, res) => {
  try {
    const { id, destinationId } = req.params;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    trip.destinations = trip.destinations.filter(dest => dest.toString() !== destinationId);
    await trip.save();

    const updatedTrip = await Trip.findById(id).populate('destinations');
    res.status(200).json(updatedTrip);

  } catch (error) {
    console.error("Error removing destination from trip", error);
    res.status(500).json({ message: "Error removing destination from trip" });
  }
};
