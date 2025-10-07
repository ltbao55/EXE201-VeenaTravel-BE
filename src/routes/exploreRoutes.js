import express from "express";
import { getExplorePlaces } from "../controllers/exploreController.js";

const router = express.Router();

// GET /api/explore
router.get("/", getExplorePlaces);

export default router;


