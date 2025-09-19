import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema({
  // Session identification
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true },
  
  // Trip context
  relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  
  // Chat messages
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    
    // Message metadata
    messageType: {
      type: String,
      enum: ['text', 'suggestion', 'itinerary', 'destination_info', 'booking_help'],
      default: 'text'
    },
    
    // AI-specific data
    aiData: {
      intent: String, // detected user intent
      entities: [{ // extracted entities
        type: String,
        value: String,
        confidence: Number
      }],
      suggestions: [{ // AI suggestions made
        type: String,
        content: mongoose.Schema.Types.Mixed,
        applied: { type: Boolean, default: false }
      }]
    }
  }],
  
  // Session context and preferences
  context: {
    currentStep: {
      type: String,
      enum: ['greeting', 'preference_gathering', 'destination_selection', 'itinerary_planning', 'customization', 'booking_assistance', 'completed']
    },
    userPreferences: {
      budget: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'VND' }
      },
      travelDates: {
        startDate: Date,
        endDate: Date,
        flexible: { type: Boolean, default: false }
      },
      destinations: [String],
      interests: [String],
      travelStyle: String,
      groupSize: Number,
      groupType: String
    },
    
    // Conversation state
    lastIntent: String,
    pendingActions: [String],
    conversationSummary: String
  },
  
  // Session status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  
  // Analytics
  messageCount: { type: Number, default: 0 },
  sessionDuration: Number, // in minutes
  satisfactionRating: { type: Number, min: 1, max: 5 },
  
  // Session metadata
  startedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  endedAt: Date,
  
  // Device and platform info
  deviceInfo: {
    userAgent: String,
    platform: String,
    language: { type: String, default: 'vi' }
  }
  
}, {
  timestamps: true
});

// Indexes (sessionId already has unique index)
chatSessionSchema.index({ user: 1, createdAt: -1 });
chatSessionSchema.index({ status: 1 });

// Pre-save middleware to update message count and last activity
chatSessionSchema.pre('save', function(next) {
  if (this.messages) {
    this.messageCount = this.messages.length;
    this.lastActivity = new Date();
  }
  next();
});

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export default ChatSession;
