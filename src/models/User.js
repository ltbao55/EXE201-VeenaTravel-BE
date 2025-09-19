import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Basic user information
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  avatar: String,
  
  // User preferences for travel
  travelPreferences: {
    preferredBudget: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'VND' }
    },
    favoriteCategories: [{
      type: String,
      enum: ['nature', 'historical', 'entertainment', 'cultural', 'adventure', 'relaxation', 'food', 'shopping']
    }],
    travelStyle: {
      type: String,
      enum: ['budget', 'mid-range', 'luxury', 'backpacker'],
      default: 'mid-range'
    },
    groupPreference: {
      type: String,
      enum: ['solo', 'couple', 'family', 'friends', 'business'],
      default: 'solo'
    },
    accommodationType: [{
      type: String,
      enum: ['hotel', 'hostel', 'homestay', 'resort', 'apartment', 'camping']
    }],
    transportPreference: [{
      type: String,
      enum: ['plane', 'train', 'bus', 'car', 'motorbike', 'walking']
    }]
  },
  
  // Location information
  location: {
    city: String,
    province: String,
    country: { type: String, default: "Vietnam" }
  },
  
  // User activity tracking
  favoriteDestinations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],
  visitedDestinations: [{
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    visitDate: Date,
    rating: { type: Number, min: 1, max: 5 }
  }],
  
  // Social features
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Account status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  
  // AI interaction history
  aiChatHistory: [{
    message: String,
    response: String,
    timestamp: { type: Date, default: Date.now }
  }]
  
}, {
  timestamps: true
});

// Index for better query performance (email already has unique index)
userSchema.index({ 'location.city': 1, 'location.province': 1 });

const User = mongoose.model("User", userSchema);
export default User;
