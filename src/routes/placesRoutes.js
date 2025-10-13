import express from 'express';
import {
  getAllPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  deletePlace,
  searchPlacesByLocation,
  batchGeocodePlaces,
  getPlacesStats
} from '../controllers/placesController.js';
import { requireAdmin, optionalAuth, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllPlaces);
router.get('/search/location', optionalAuth, searchPlacesByLocation);
router.get('/:id', optionalAuth, getPlaceById);

// Admin only routes
router.post('/', verifyToken, requireAdmin, createPlace);
router.put('/:id', verifyToken, requireAdmin, updatePlace);
router.delete('/:id', verifyToken, requireAdmin, deletePlace);
router.post('/batch-geocode', verifyToken, requireAdmin, batchGeocodePlaces);
router.get('/stats', verifyToken, requireAdmin, getPlacesStats);

export default router;
