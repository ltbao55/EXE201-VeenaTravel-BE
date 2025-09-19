import express from 'express';
import {
  createTrip,
  deleteTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  addDestinationToTrip,
  removeDestinationFromTrip
} from '../controllers/tripsControllers.js';

const router = express.Router();

// Get all trips with optional filters
router.get("/", getAllTrips);

// Get trip by ID
router.get("/:id", getTripById);

// Create new trip
router.post("/", createTrip);

// Update trip
router.put("/:id", updateTrip);

// Delete trip
router.delete("/:id", deleteTrip);

// Add destination to trip
router.post("/:id/destinations", addDestinationToTrip);

// Remove destination from trip
router.delete("/:id/destinations/:destinationId", removeDestinationFromTrip);

export default router;