import Review from '../models/Review.js';
import Destination from '../models/Destination.js';

export const getAllReviews = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      destination, 
      user, 
      rating,
      status = 'approved'
    } = req.query;
    
    const query = {};
    
    if (destination) query.destination = destination;
    if (user) query.user = user;
    if (rating) query.rating = rating;
    if (status) query.status = status;
    
    const reviews = await Review.find(query)
      .populate('destination', 'name location category images')
      .populate('user', 'name avatar')
      .populate('response.respondedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Review.countDocuments(query);
    
    res.status(200).json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error calling getAllReviews", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
};

export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id)
      .populate('destination', 'name location category images')
      .populate('user', 'name avatar')
      .populate('response.respondedBy', 'name');
      
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    res.status(200).json(review);
  } catch (error) {
    console.error("Error calling getReviewById", error);
    res.status(500).json({ message: "Error fetching review" });
  }
};

export const createReview = async (req, res) => {
  try {
    const reviewData = req.body;
    
    // Validate required fields
    if (!reviewData.destination || !reviewData.user || !reviewData.rating || 
        !reviewData.title || !reviewData.content) {
      return res.status(400).json({ 
        message: "Missing required fields: destination, user, rating, title, content" 
      });
    }
    
    // Check if destination exists
    const destination = await Destination.findById(reviewData.destination);
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }
    
    // Check if user already reviewed this destination
    const existingReview = await Review.findOne({
      destination: reviewData.destination,
      user: reviewData.user
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        message: "You have already reviewed this destination" 
      });
    }
    
    const review = new Review(reviewData);
    const newReview = await review.save();
    
    // Update destination rating
    await updateDestinationRating(reviewData.destination);
    
    const populatedReview = await Review.findById(newReview._id)
      .populate('destination', 'name location category')
      .populate('user', 'name avatar');
    
    res.status(201).json(populatedReview);
    
  } catch (error) {
    console.error("Error calling createReview", error);
    res.status(500).json({ message: "Error creating review" });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow changing destination or user
    delete updateData.destination;
    delete updateData.user;
    
    const review = await Review.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    )
    .populate('destination', 'name location category')
    .populate('user', 'name avatar');
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    // Update destination rating if rating changed
    if (updateData.rating) {
      await updateDestinationRating(review.destination._id);
    }
    
    res.status(200).json(review);
  } catch (error) {
    console.error("Error calling updateReview", error);
    res.status(500).json({ message: "Error updating review" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findByIdAndDelete(id);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    // Update destination rating
    await updateDestinationRating(review.destination);
    
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error calling deleteReview", error);
    res.status(500).json({ message: "Error deleting review" });
  }
};

export const markReviewHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findByIdAndUpdate(
      id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    )
    .populate('destination', 'name location category')
    .populate('user', 'name avatar');
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    res.status(200).json(review);
  } catch (error) {
    console.error("Error marking review as helpful", error);
    res.status(500).json({ message: "Error marking review as helpful" });
  }
};

export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const review = await Review.findByIdAndUpdate(
      id,
      { 
        $inc: { reportCount: 1 },
        status: 'pending' // Set to pending for moderation
      },
      { new: true }
    );
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    res.status(200).json({ message: "Review reported successfully" });
  } catch (error) {
    console.error("Error reporting review", error);
    res.status(500).json({ message: "Error reporting review" });
  }
};

export const respondToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, respondedBy } = req.body;
    
    if (!content || !respondedBy) {
      return res.status(400).json({ 
        message: "Content and respondedBy are required" 
      });
    }
    
    const review = await Review.findByIdAndUpdate(
      id,
      {
        response: {
          content,
          respondedBy,
          respondedAt: new Date()
        }
      },
      { new: true }
    )
    .populate('destination', 'name location category')
    .populate('user', 'name avatar')
    .populate('response.respondedBy', 'name');
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    res.status(200).json(review);
  } catch (error) {
    console.error("Error responding to review", error);
    res.status(500).json({ message: "Error responding to review" });
  }
};

export const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moderationNotes } = req.body;
    
    if (!['approved', 'rejected', 'hidden'].includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be approved, rejected, or hidden" 
      });
    }
    
    const review = await Review.findByIdAndUpdate(
      id,
      { status, moderationNotes },
      { new: true }
    )
    .populate('destination', 'name location category')
    .populate('user', 'name avatar');
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    // Update destination rating if status changed to approved/rejected
    if (status === 'approved' || status === 'rejected') {
      await updateDestinationRating(review.destination._id);
    }
    
    res.status(200).json(review);
  } catch (error) {
    console.error("Error moderating review", error);
    res.status(500).json({ message: "Error moderating review" });
  }
};

// Helper function to update destination rating
async function updateDestinationRating(destinationId) {
  try {
    const reviews = await Review.find({ 
      destination: destinationId, 
      status: 'approved' 
    });
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      await Destination.findByIdAndUpdate(destinationId, {
        'rating.average': Math.round(averageRating * 10) / 10, // Round to 1 decimal
        'rating.count': reviews.length
      });
    } else {
      await Destination.findByIdAndUpdate(destinationId, {
        'rating.average': 0,
        'rating.count': 0
      });
    }
  } catch (error) {
    console.error("Error updating destination rating", error);
  }
}
