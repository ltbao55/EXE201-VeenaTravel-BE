import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
  // User who created this trip (optional for anonymous trips)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },

  // AI-generated itinerary (JSON format from Gemini)
  // ✅ Includes geocoded locations with coordinates, photos, place_id, etc.
  itinerary: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Trip metadata
  destination: String, // Main destination extracted by AI
  interests: [String], // User interests extracted by AI

  // Trip status
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },

  // Chat session reference (if applicable)
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession'
  },

  // Trip sharing
  isPublic: {
    type: Boolean,
    default: false
  },

  // User feedback
  rating: {
    type: Number,
    min: 1,
    max: 5
  },

  feedback: String

}, {
  timestamps: true
});

// Indexes for better query performance
tripSchema.index({ userId: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ destination: 1 });
tripSchema.index({ createdAt: -1 });
tripSchema.index({ userId: 1, status: 1 });

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;