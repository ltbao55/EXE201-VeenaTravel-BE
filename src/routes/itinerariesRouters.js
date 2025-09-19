import express from 'express';
import {
  getAllItineraries,
  getItineraryById,
  getTripItineraries,
  createItinerary,
  updateItinerary,
  deleteItinerary,
  addActivityToItinerary,
  updateActivity,
  removeActivityFromItinerary,
  reorderActivities
} from '../controllers/itinerariesControllers.js';

const router = express.Router();

// Get all itineraries with optional filters
router.get("/", getAllItineraries);

// Get itinerary by ID
router.get("/:id", getItineraryById);

// Create new itinerary
router.post("/", createItinerary);

// Update itinerary
router.put("/:id", updateItinerary);

// Delete itinerary
router.delete("/:id", deleteItinerary);

// Get all itineraries for a specific trip
router.get("/trip/:tripId", getTripItineraries);

// Add activity to itinerary
router.post("/:id/activities", addActivityToItinerary);

// Update specific activity in itinerary
router.put("/:id/activities/:activityId", updateActivity);

// Remove activity from itinerary
router.delete("/:id/activities/:activityId", removeActivityFromItinerary);

// Reorder activities in itinerary
router.put("/:id/activities/reorder", reorderActivities);

export default router;
