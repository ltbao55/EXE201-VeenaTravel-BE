import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema({
  // Unique session identifier
  sessionId: {
    type: String,
    required: true,
    unique: true
  },

  // User reference (optional for anonymous chats)
  // Can be ObjectId (for registered users) or String (for test/anonymous users)
  userId: {
    type: mongoose.Schema.Types.Mixed,  // Allow both ObjectId and String
    required: false
  },

  // Chat messages
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Session metadata
  title: String, // Auto-generated from first message

  // Session status
  isActive: {
    type: Boolean,
    default: true
  },

  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },

  // Message count for subscription limits
  messageCount: {
    type: Number,
    default: 0
  },

  // Related trip (if generated)
  generatedTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  }

}, {
  timestamps: true
});

// Indexes for better query performance
// Note: sessionId already has index via unique: true
chatSessionSchema.index({ userId: 1 });
chatSessionSchema.index({ isActive: 1 });
chatSessionSchema.index({ lastActivity: -1 });
chatSessionSchema.index({ userId: 1, isActive: 1 });

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
