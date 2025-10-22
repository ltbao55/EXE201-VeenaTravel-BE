import express from 'express';
import {
  getAllDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getDestinationsByLocation,
  getPopularDestinations,
  getDestinationReviews,
  searchDestinations
} from '../controllers/destinationsControllers.js';

const router = express.Router();

// Get all destinations with filters
router.get("/", getAllDestinations);

// Search destinations
router.get("/search", searchDestinations);

// Get popular destinations
router.get("/popular", getPopularDestinations);

// Get destinations by location (nearby)
router.get("/nearby", getDestinationsByLocation);

// Get destination by ID
router.get("/:id", getDestinationById);

// Create new destination
router.post("/", createDestination);

// Update destination
router.put("/:id", updateDestination);

// Delete (deactivate) destination
router.delete("/:id", deleteDestination);

// Get destination reviews
router.get("/:id/reviews", getDestinationReviews);

export default router;
