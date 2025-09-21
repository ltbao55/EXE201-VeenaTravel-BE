import mongoose from "mongoose";

const placeSchema = new mongoose.Schema({
  // Basic place information
  name: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Full text address for Geocoding API
  address: { 
    type: String, 
    required: true 
  },
  
  // Description and categorization
  description: String,
  tags: [{
    type: String,
    index: true
  }],
  
  // Coordinates from Google Geocoding API
  location: {
    lat: { 
      type: Number, 
      required: true 
    },
    lng: { 
      type: Number, 
      required: true 
    }
  },
  
  // Additional information
  category: {
    type: String,
    enum: ['restaurant', 'attraction', 'hotel', 'shopping', 'entertainment', 'nature', 'historical', 'cultural', 'other'],
    default: 'other'
  },
  
  // Image URLs
  images: [String],
  
  // Rating and reviews
  rating: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  // Contact information
  contact: {
    phone: String,
    website: String,
    email: String
  },
  
  // Operating hours
  openingHours: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String
  },
  
  // Price range
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$'],
    default: '$$'
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Admin who added this place
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
placeSchema.index({ name: 1 });
placeSchema.index({ tags: 1 });
placeSchema.index({ category: 1 });
placeSchema.index({ 'location.lat': 1, 'location.lng': 1 });
placeSchema.index({ isActive: 1 });

// Text search index for name and description
placeSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
});

const Place = mongoose.model("Place", placeSchema);
export default Place;
