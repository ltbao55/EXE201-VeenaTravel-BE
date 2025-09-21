import express from 'express';
import {
  getAllPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  deletePlace,
  searchPlacesByLocation,
  batchGeocodePlaces
} from '../controllers/placesController.js';
import { verifyFirebaseToken, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllPlaces);
router.get('/search/location', optionalAuth, searchPlacesByLocation);
router.get('/:id', optionalAuth, getPlaceById);

// Admin only routes
router.post('/', verifyFirebaseToken, requireAdmin, createPlace);
router.put('/:id', verifyFirebaseToken, requireAdmin, updatePlace);
router.delete('/:id', verifyFirebaseToken, requireAdmin, deletePlace);
router.post('/batch-geocode', verifyFirebaseToken, requireAdmin, batchGeocodePlaces);

export default router;
