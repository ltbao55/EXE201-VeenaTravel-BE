import express from "express";
import exploreController from "../controllers/exploreController.js";

const router = express.Router();

/**
 * =================================================================
 * EXPLORE API ROUTES - ENHANCED
 * =================================================================
 * Comprehensive explore endpoints with filtering, sorting, caching
 * =================================================================
 */

/**
 * @route   GET /api/explore
 * @desc    Get explore places with advanced filters
 * @query   page, limit, city, category, q, minRating, sort, lat, lng, source, random, maxDistance
 * @access  Public
 */
router.get("/", exploreController.getExplorePlaces);

/**
 * @route   GET /api/explore/nearby
 * @desc    Find nearby places based on user location (Hybrid Search)
 * @query   lat (required), lng (required), radius, category, limit
 * @access  Public
 */
router.get("/nearby", exploreController.getNearbyPlaces);

/**
 * @route   GET /api/explore/categories
 * @desc    Get available categories with counts
 * @query   city (optional)
 * @access  Public
 */
router.get("/categories", exploreController.getCategories);

/**
 * @route   GET /api/explore/featured
 * @desc    Get featured/curated places (high rating, popular)
 * @query   limit, city, category
 * @access  Public
 */
router.get("/featured", exploreController.getFeaturedPlaces);

/**
 * @route   GET /api/explore/place/:placeId
 * @desc    Get detailed information about a place by Google Maps placeId
 * @params  placeId (Google Maps place ID)
 * @access  Public
 */
router.get("/place/:placeId", exploreController.getPlaceDetailsByPlaceId);

/**
 * @route   GET /api/explore/:id
 * @desc    Get detailed information about a specific place
 * @params  id (place ID)
 * @query   source (auto|places|partners)
 * @access  Public
 */
router.get("/:id", exploreController.getPlaceDetails);

export default router;


