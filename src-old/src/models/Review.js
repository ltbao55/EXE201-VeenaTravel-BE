import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  // Review target
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }, // Optional: if review is part of a trip
  
  // Reviewer information
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Review content
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  // Review details
  visitDate: Date,
  travelType: {
    type: String,
    enum: ['solo', 'couple', 'family', 'friends', 'business']
  },
  
  // Detailed ratings
  detailedRatings: {
    value: { type: Number, min: 1, max: 5 }, // Value for money
    service: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    location: { type: Number, min: 1, max: 5 },
    facilities: { type: Number, min: 1, max: 5 }
  },
  
  // Media
  images: [String],
  
  // Review metadata
  isVerified: { type: Boolean, default: false }, // Verified visit
  helpfulCount: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending'
  },
  moderationNotes: String,
  
  // Response from business/admin
  response: {
    content: String,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date
  }
  
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ destination: 1, rating: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
