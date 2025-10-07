import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Plan reference
  planId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Plan',
    required: true
  },
  
  // Subscription status
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  },
  
  // Subscription period
  startDate: {
    type: Date,
    default: Date.now
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  // Usage tracking
  current_trip_count: {
    type: Number,
    default: 0,
    min: 0
  },
  
  current_message_count: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Payment information
  lastPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  
  // Auto renewal
  autoRenewal: {
    type: Boolean,
    default: false
  },
  
  // Cancellation information
  cancelledAt: Date,
  cancellationReason: String
  
}, {
  timestamps: true
});

// Indexes for better query performance
userSubscriptionSchema.index({ userId: 1 });
userSubscriptionSchema.index({ planId: 1 });
userSubscriptionSchema.index({ status: 1 });
userSubscriptionSchema.index({ endDate: 1 });
userSubscriptionSchema.index({ userId: 1, status: 1 });

// Compound index for finding active subscriptions
userSubscriptionSchema.index({ 
  userId: 1, 
  status: 1, 
  endDate: 1 
});

const UserSubscription = mongoose.model("UserSubscription", userSubscriptionSchema);
export default UserSubscription;
