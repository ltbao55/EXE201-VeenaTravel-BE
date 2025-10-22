import mongoose from "mongoose";

const itinerarySchema = new mongoose.Schema({
  // Basic itinerary information
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  dayNumber: { type: Number, required: true }, // Day 1, Day 2, etc.
  date: { type: Date, required: true },
  title: String, // Optional title for the day
  
  // Daily activities
  activities: [{
    // Activity details
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    customLocation: { // For places not in destination database
      name: String,
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    
    // Timing
    startTime: String, // Format: "09:00"
    endTime: String,   // Format: "11:30"
    duration: Number,  // in minutes
    
    // Activity type and details
    type: {
      type: String,
      enum: ['sightseeing', 'dining', 'shopping', 'transportation', 'accommodation', 'activity', 'rest'],
      required: true
    },
    title: { type: String, required: true },
    description: String,
    notes: String, // User's personal notes
    
    // Cost information
    estimatedCost: {
      amount: Number,
      currency: { type: String, default: 'VND' },
      costType: { type: String, enum: ['per_person', 'total', 'per_group'] }
    },
    actualCost: {
      amount: Number,
      currency: { type: String, default: 'VND' }
    },
    
    // Booking information
    bookingInfo: {
      isBooked: { type: Boolean, default: false },
      bookingReference: String,
      bookingUrl: String,
      contactInfo: String
    },
    
    // Priority and status
    priority: {
      type: String,
      enum: ['must-do', 'recommended', 'optional'],
      default: 'recommended'
    },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'completed', 'cancelled', 'skipped'],
      default: 'planned'
    },
    
    // AI suggestions
    isAiSuggested: { type: Boolean, default: false },
    aiConfidence: Number, // 0-1 scale
    
    // Order in the day
    order: { type: Number, required: true }
  }],
  
  // Transportation between activities
  transportation: [{
    fromActivity: Number, // Index of activity in activities array
    toActivity: Number,   // Index of next activity
    method: {
      type: String,
      enum: ['walking', 'taxi', 'bus', 'train', 'motorbike', 'car', 'plane', 'boat']
    },
    duration: Number, // in minutes
    cost: {
      amount: Number,
      currency: { type: String, default: 'VND' }
    },
    notes: String
  }],
  
  // Daily summary
  dailySummary: {
    totalCost: {
      estimated: Number,
      actual: Number,
      currency: { type: String, default: 'VND' }
    },
    totalDuration: Number, // in minutes
    activitiesCount: Number,
    mainTheme: String // e.g., "Cultural exploration", "Nature adventure"
  },
  
  // Weather and conditions
  weather: {
    condition: String,
    temperature: {
      min: Number,
      max: Number,
      unit: { type: String, default: 'C' }
    },
    recommendation: String
  },
  
  // User customization
  isCustomized: { type: Boolean, default: false },
  customizationNotes: String,
  
  // Status
  isActive: { type: Boolean, default: true }
  
}, {
  timestamps: true
});

// Indexes for better query performance
itinerarySchema.index({ tripId: 1, dayNumber: 1 });
itinerarySchema.index({ date: 1 });
itinerarySchema.index({ 'activities.destination': 1 });

// Pre-save middleware to calculate daily summary
itinerarySchema.pre('save', function(next) {
  if (this.activities && this.activities.length > 0) {
    // Calculate total estimated cost
    let totalEstimated = 0;
    let totalActual = 0;
    let totalDuration = 0;
    
    this.activities.forEach(activity => {
      if (activity.estimatedCost && activity.estimatedCost.amount) {
        totalEstimated += activity.estimatedCost.amount;
      }
      if (activity.actualCost && activity.actualCost.amount) {
        totalActual += activity.actualCost.amount;
      }
      if (activity.duration) {
        totalDuration += activity.duration;
      }
    });
    
    this.dailySummary = {
      ...this.dailySummary,
      totalCost: {
        estimated: totalEstimated,
        actual: totalActual,
        currency: 'VND'
      },
      totalDuration: totalDuration,
      activitiesCount: this.activities.length
    };
  }
  next();
});

const Itinerary = mongoose.model("Itinerary", itinerarySchema);
export default Itinerary;
