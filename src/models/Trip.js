import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
  // Basic trip information
  name: { type: String, required: true },
  description: { type: String, required: true },

  // User who created this trip
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Trip details
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number }, // in days, calculated field

  // Budget information
  estimatedBudget: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'VND' }
  },
  actualCost: { type: Number, default: 0 },

  // Trip preferences
  travelStyle: {
    type: String,
    enum: ['budget', 'mid-range', 'luxury', 'backpacker'],
    default: 'mid-range'
  },
  groupSize: { type: Number, default: 1 },
  groupType: {
    type: String,
    enum: ['solo', 'couple', 'family', 'friends', 'business'],
    default: 'solo'
  },

  // Destinations and itinerary
  destinations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],
  itinerary: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary'
  }],

  // Trip status and metadata
  status: {
    type: String,
    enum: ['planning', 'confirmed', 'ongoing', 'completed', 'cancelled'],
    default: 'planning'
  },
  isPublic: { type: Boolean, default: false },
  tags: [String],

  // AI-generated content
  aiRecommendations: [{
    type: { type: String }, // 'restaurant', 'activity', 'accommodation'
    content: String,
    confidence: Number
  }],

  // Social features
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },

}, {
  timestamps: true
});

// Calculate duration before saving
tripSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;