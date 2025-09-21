import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  // Plan basic information
  name: { 
    type: String, 
    required: true,
    unique: true
  },
  
  // Pricing
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Usage limits
  trip_limit: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  message_limit: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Plan description and features
  description: String,
  features: [String],
  
  // Plan type
  type: {
    type: String,
    enum: ['free', 'premium', 'pro'],
    default: 'free'
  },
  
  // Duration in days (0 means unlimited)
  duration: {
    type: Number,
    default: 30,
    min: 0
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Display order
  displayOrder: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
planSchema.index({ name: 1 });
planSchema.index({ type: 1 });
planSchema.index({ isActive: 1 });
planSchema.index({ displayOrder: 1 });

const Plan = mongoose.model("Plan", planSchema);
export default Plan;
