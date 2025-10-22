import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserPreferences,
  addFavoriteDestination,
  removeFavoriteDestination,
  getUserTrips
} from '../controllers/usersControllers.js';

const router = express.Router();

// Get all users with optional search
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Create new user
router.post("/", createUser);

// Update user
router.put("/:id", updateUser);

// Delete user
router.delete("/:id", deleteUser);

// Update user travel preferences
router.put("/:id/preferences", updateUserPreferences);

// Add favorite destination
router.post("/:id/favorites", addFavoriteDestination);

// Remove favorite destination
router.delete("/:id/favorites/:destinationId", removeFavoriteDestination);

// Get user's trips
router.get("/:id/trips", getUserTrips);

export default router;