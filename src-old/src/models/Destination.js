import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema({
  // Basic destination information
  name: { type: String, required: true },
  description: { type: String, required: true },
  
  // Location details
  location: {
    address: String,
    city: { type: String, required: true },
    province: { type: String, required: true },
    country: { type: String, default: "Vietnam" },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    region: {
      type: String,
      enum: ['north', 'central', 'south'],
      required: true
    }
  },
  
  // Destination categorization
  category: {
    type: String,
    enum: ['nature', 'historical', 'entertainment', 'cultural', 'adventure', 'relaxation', 'food', 'shopping', 'religious', 'beach', 'mountain', 'city'],
    required: true
  },
  subcategory: [String], // More specific categories
  
  // Practical information
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  
  // Cost information
  entranceFee: {
    adult: Number,
    child: Number,
    student: Number,
    senior: Number,
    currency: { type: String, default: 'VND' }
  },
  
  // Visit information
  recommendedDuration: { type: Number }, // in hours
  bestTimeToVisit: {
    months: [{ type: String, enum: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }],
    timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night', 'anytime'] }
  },
  
  // Media and content
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false }
  }],
  videos: [String],
  
  // Ratings and reviews
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  
  // Popularity and features
  isPopular: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  tags: [String],
  
  // Accessibility and facilities
  facilities: [{
    type: String,
    enum: ['parking', 'restroom', 'restaurant', 'gift_shop', 'wifi', 'wheelchair_accessible', 'family_friendly', 'pet_friendly']
  }],
  
  // Transportation
  nearbyTransport: [{
    type: { type: String, enum: ['bus_stop', 'train_station', 'airport', 'taxi_stand'] },
    name: String,
    distance: Number // in meters
  }],
  
  // Related destinations
  nearbyDestinations: [{
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    distance: Number // in kilometers
  }],
  
  // Administrative
  isActive: { type: Boolean, default: true },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  
  // Analytics
  viewCount: { type: Number, default: 0 },
  bookmarkCount: { type: Number, default: 0 }
  
}, {
  timestamps: true
});

// Indexes for better query performance
destinationSchema.index({ 'location.city': 1, 'location.province': 1 });
destinationSchema.index({ category: 1 });
destinationSchema.index({ isPopular: 1 });
destinationSchema.index({ 'location.coordinates': '2dsphere' });
destinationSchema.index({ 'rating.average': -1 });

const Destination = mongoose.model("Destination", destinationSchema);
export default Destination;
