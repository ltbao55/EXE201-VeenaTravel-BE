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

const router = express.Router();

// Public routes
router.get('/', getAllPlaces);
router.get('/search/location', searchPlacesByLocation);
router.get('/:id', getPlaceById);

// Routes (previously admin only, now public)
router.post('/', createPlace);
router.put('/:id', updatePlace);
router.delete('/:id', deletePlace);
router.post('/batch-geocode', batchGeocodePlaces);

export default router;
