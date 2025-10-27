import UserSubscription from '../models/UserSubscription.js';
import Plan from '../models/Plan.js';

/**
 * Middleware kiểm tra quyền truy cập dựa trên subscription
 * @param {string} requiredType - Loại subscription yêu cầu ('free', 'premium', 'pro')
 * @param {string} action - Hành động cần kiểm tra ('trip', 'message', 'feature')
 */
export const requireSubscription = (requiredType = 'free', action = 'trip') => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;

      // Lấy subscription hiện tại của user
      const subscription = await UserSubscription.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('planId');

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found',
          code: 'NO_SUBSCRIPTION'
        });
      }

      // Kiểm tra loại subscription
      const userPlanType = subscription.planId.type;
      const planHierarchy = { 'free': 1, 'premium': 2, 'pro': 3 };
      
      if (planHierarchy[userPlanType] < planHierarchy[requiredType]) {
        return res.status(403).json({
          success: false,
          message: `${requiredType} subscription required`,
          code: 'INSUFFICIENT_SUBSCRIPTION',
          currentPlan: userPlanType,
          requiredPlan: requiredType
        });
      }

      // Kiểm tra giới hạn sử dụng
      if (action === 'trip') {
        if (subscription.current_trip_count >= subscription.planId.trip_limit) {
          return res.status(403).json({
            success: false,
            message: 'Trip limit exceeded',
            code: 'TRIP_LIMIT_EXCEEDED',
            current: subscription.current_trip_count,
            limit: subscription.planId.trip_limit
          });
        }
      } else if (action === 'message') {
        // message_limit = 0 nghĩa là unlimited
        if (subscription.planId.message_limit > 0 && subscription.current_message_count >= subscription.planId.message_limit) {
          return res.status(403).json({
            success: false,
            message: 'Bạn đã hết lượt chat miễn phí. Vui lòng nâng cấp lên Premium để tiếp tục chat không giới hạn!',
            code: 'MESSAGE_LIMIT_EXCEEDED',
            current: subscription.current_message_count,
            limit: subscription.planId.message_limit,
            upgradeUrl: '/subscriptions/upgrade'
          });
        }
      }

      // Thêm thông tin subscription vào request
      req.subscription = subscription;
      req.userPlan = userPlanType;
      
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check subscription',
        code: 'SUBSCRIPTION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware kiểm tra quyền premium
 */
export const requirePremium = (action = 'trip') => {
  return requireSubscription('premium', action);
};

/**
 * Middleware kiểm tra quyền pro
 */
export const requirePro = (action = 'trip') => {
  return requireSubscription('pro', action);
};

/**
 * Middleware kiểm tra giới hạn trip
 */
export const checkTripLimit = requireSubscription('free', 'trip');

/**
 * Middleware kiểm tra giới hạn message
 */
export const checkMessageLimit = requireSubscription('free', 'message');

/**
 * Middleware kiểm tra tính năng premium
 */
export const requirePremiumFeature = requireSubscription('premium');

/**
 * Lấy thông tin subscription của user
 */
export const getUserSubscriptionInfo = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId');

    if (subscription) {
      req.subscription = subscription;
      req.userPlan = subscription.planId.type;
    } else {
      req.subscription = null;
      req.userPlan = 'free'; // Default to free
    }

    next();
  } catch (error) {
    console.error('Get subscription info error:', error);
    req.subscription = null;
    req.userPlan = 'free';
    next();
  }
};

/**
 * Kiểm tra xem user có thể sử dụng tính năng không
 */
export const canUseFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;

      const subscription = await UserSubscription.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('planId');

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found',
          code: 'NO_SUBSCRIPTION'
        });
      }

      // Định nghĩa các tính năng cho từng loại subscription
      const featureAccess = {
        'free': ['basic_chat', 'basic_trip'],
        'premium': ['basic_chat', 'basic_trip', 'advanced_chat', 'unlimited_trips', 'priority_support'],
        'pro': ['basic_chat', 'basic_trip', 'advanced_chat', 'unlimited_trips', 'priority_support', 'api_access', 'custom_features']
      };

      const userPlan = subscription.planId.type;
      const allowedFeatures = featureAccess[userPlan] || [];

      if (!allowedFeatures.includes(feature)) {
        return res.status(403).json({
          success: false,
          message: `Feature '${feature}' requires higher subscription`,
          code: 'FEATURE_NOT_AVAILABLE',
          currentPlan: userPlan,
          requiredFeatures: allowedFeatures
        });
      }

      req.subscription = subscription;
      req.userPlan = userPlan;
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check feature access',
        code: 'FEATURE_CHECK_ERROR'
      });
    }
  };
};
