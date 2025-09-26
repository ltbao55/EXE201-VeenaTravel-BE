import UserSubscription from '../models/UserSubscription.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';

// Get user's current subscription
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required as query parameter'
      });
    }
    
    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId', 'name price trip_limit message_limit type');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription'
    });
  }
};

// Get user's subscription history
export const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required as query parameter'
      });
    }
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const subscriptions = await UserSubscription.find({ userId })
      .populate('planId', 'name price type')
      .populate('lastPaymentId', 'amount status paidAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UserSubscription.countDocuments({ userId });
    
    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history'
    });
  }
};

// Create default free subscription for new user
export const createDefaultSubscription = async (userId) => {
  try {
    // Find the free plan
    const freePlan = await Plan.findOne({ type: 'free', isActive: true });
    
    if (!freePlan) {
      throw new Error('No free plan available');
    }
    
    // Calculate end date (30 days from now for free plan)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (freePlan.duration || 30));
    
    const subscription = new UserSubscription({
      userId,
      planId: freePlan._id,
      status: 'active',
      startDate: new Date(),
      endDate,
      current_trip_count: 0,
      current_message_count: 0
    });
    
    await subscription.save();
    return subscription;
  } catch (error) {
    console.error('Create default subscription error:', error);
    throw error;
  }
};

// Check if user can create trip (within limits)
export const checkTripLimit = async (req, res) => {
  try {
    const userId = req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required as query parameter'
      });
    }
    
    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId');
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    const canCreateTrip = subscription.current_trip_count < subscription.planId.trip_limit;
    
    res.json({
      success: true,
      data: {
        canCreateTrip,
        current_trip_count: subscription.current_trip_count,
        trip_limit: subscription.planId.trip_limit,
        remaining_trips: subscription.planId.trip_limit - subscription.current_trip_count
      }
    });
  } catch (error) {
    console.error('Check trip limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check trip limit'
    });
  }
};

// Check if user can send message (within limits)
export const checkMessageLimit = async (req, res) => {
  try {
    const userId = req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required as query parameter'
      });
    }
    
    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId');
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found'
      });
    }
    
    const canSendMessage = subscription.current_message_count < subscription.planId.message_limit;
    
    res.json({
      success: true,
      data: {
        canSendMessage,
        current_message_count: subscription.current_message_count,
        message_limit: subscription.planId.message_limit,
        remaining_messages: subscription.planId.message_limit - subscription.current_message_count
      }
    });
  } catch (error) {
    console.error('Check message limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check message limit'
    });
  }
};

// Increment trip count
export const incrementTripCount = async (userId) => {
  try {
    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (subscription) {
      subscription.current_trip_count += 1;
      await subscription.save();
    }
    
    return subscription;
  } catch (error) {
    console.error('Increment trip count error:', error);
    throw error;
  }
};

// Increment message count
export const incrementMessageCount = async (userId) => {
  try {
    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    
    if (subscription) {
      subscription.current_message_count += 1;
      await subscription.save();
    }
    
    return subscription;
  } catch (error) {
    console.error('Increment message count error:', error);
    throw error;
  }
};

// Admin: Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const { status, planId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (planId) filter.planId = planId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const subscriptions = await UserSubscription.find(filter)
      .populate('userId', 'name email')
      .populate('planId', 'name price type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UserSubscription.countDocuments(filter);
    
    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
};

// Admin: Update subscription
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const subscription = await UserSubscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    Object.assign(subscription, updateData);
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};
