import express from 'express';
import {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  reportReview,
  respondToReview,
  moderateReview
} from '../controllers/reviewsControllers.js';

const router = express.Router();

// Get all reviews with filters
router.get("/", getAllReviews);

// Get review by ID
router.get("/:id", getReviewById);

// Create new review
router.post("/", createReview);

// Update review
router.put("/:id", updateReview);

// Delete review
router.delete("/:id", deleteReview);

// Mark review as helpful
router.post("/:id/helpful", markReviewHelpful);

// Report review
router.post("/:id/report", reportReview);

// Respond to review (for business owners/admins)
router.post("/:id/respond", respondToReview);

// Moderate review (admin only)
router.put("/:id/moderate", moderateReview);

export default router;
