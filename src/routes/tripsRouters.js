import express from 'express';
import { createTrip, deleteTrip, getAllTrips, updateTrip } from '../controllers/tripsControllers.js';

const router = express.Router();

router.get("/", getAllTrips);

router.post("/", createTrip);

router.put("/:id", updateTrip);

router.delete("/:id", deleteTrip);

export default router;