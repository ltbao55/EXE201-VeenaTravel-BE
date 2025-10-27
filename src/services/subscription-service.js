import UserSubscription from '../models/UserSubscription.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';

/**
 * Service xử lý subscription sau khi thanh toán
 */
class SubscriptionService {
  
  /**
   * Tạo hoặc cập nhật subscription sau khi thanh toán thành công
   * @param {string} userId - ID của user
   * @param {string} paymentId - ID của payment
   * @param {Object} paymentData - Dữ liệu thanh toán
   */
  static async createOrUpdateSubscription(userId, paymentId, paymentData) {
    try {
      console.log('🔄 Creating/updating subscription for user:', userId);
      
      // Tìm plan dựa trên amount hoặc metadata
      const plan = await this.findPlanByPaymentData(paymentData);
      
      if (!plan) {
        throw new Error('No matching plan found for payment');
      }

      // Kiểm tra xem user đã có subscription active chưa
      const existingSubscription = await UserSubscription.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (existingSubscription) {
        // Cập nhật subscription hiện tại
        console.log('📝 Updating existing subscription');
        existingSubscription.planId = plan._id;
        existingSubscription.status = 'active';
        existingSubscription.startDate = new Date();
        existingSubscription.endDate = this.calculateEndDate(plan);
        existingSubscription.lastPaymentId = paymentId;
        existingSubscription.autoRenewal = true;
        
        // Reset usage counters
        existingSubscription.current_trip_count = 0;
        existingSubscription.current_message_count = 0;
        
        await existingSubscription.save();
        return existingSubscription;
      } else {
        // Tạo subscription mới
        console.log('✨ Creating new subscription');
        const subscription = new UserSubscription({
          userId,
          planId: plan._id,
          status: 'active',
          startDate: new Date(),
          endDate: this.calculateEndDate(plan),
          current_trip_count: 0,
          current_message_count: 0,
          lastPaymentId: paymentId,
          autoRenewal: true
        });

        await subscription.save();
        return subscription;
      }
    } catch (error) {
      console.error('❌ Create/update subscription error:', error);
      throw error;
    }
  }

  /**
   * Tìm plan dựa trên dữ liệu thanh toán
   * @param {Object} paymentData - Dữ liệu thanh toán
   */
  static async findPlanByPaymentData(paymentData) {
    try {
      const { amount, metadata } = paymentData;
      
      // Tìm plan dựa trên amount
      let plan = await Plan.findOne({
        price: amount,
        isActive: true
      });

      // Nếu không tìm thấy theo amount, tìm theo metadata
      if (!plan && metadata && metadata.planId) {
        plan = await Plan.findById(metadata.planId);
      }

      // Nếu vẫn không tìm thấy, tìm plan premium mặc định
      if (!plan) {
        plan = await Plan.findOne({
          type: 'premium',
          isActive: true
        });
      }

      // Nếu vẫn không tìm thấy, tìm plan có giá gần nhất
      if (!plan) {
        const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
        plan = plans.find(p => p.price <= amount) || plans[0];
      }

      return plan;
    } catch (error) {
      console.error('❌ Find plan error:', error);
      throw error;
    }
  }

  /**
   * Tính toán ngày kết thúc subscription
   * @param {Object} plan - Plan object
   */
  static calculateEndDate(plan) {
    const endDate = new Date();
    
    if (plan.duration === 0) {
      // Unlimited duration
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      endDate.setDate(endDate.getDate() + plan.duration);
    }
    
    return endDate;
  }

  /**
   * Tạo subscription miễn phí cho user mới
   * @param {string} userId - ID của user
   */
  static async createFreeSubscription(userId) {
    try {
      console.log('🆓 Creating free subscription for new user:', userId);
      
      const freePlan = await Plan.findOne({
        type: 'free',
        isActive: true
      });

      if (!freePlan) {
        throw new Error('No free plan available');
      }

      const subscription = new UserSubscription({
        userId,
        planId: freePlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: this.calculateEndDate(freePlan),
        current_trip_count: 0,
        current_message_count: 0
      });

      await subscription.save();
      console.log('✅ Free subscription created');
      return subscription;
    } catch (error) {
      console.error('❌ Create free subscription error:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra và cập nhật trạng thái subscription hết hạn
   * @param {string} userId - ID của user
   */
  static async checkAndUpdateExpiredSubscription(userId) {
    try {
      const expiredSubscriptions = await UserSubscription.find({
        userId,
        status: 'active',
        endDate: { $lte: new Date() }
      });

      for (const subscription of expiredSubscriptions) {
        subscription.status = 'expired';
        await subscription.save();
        console.log(`⏰ Subscription ${subscription._id} expired`);
      }

      return expiredSubscriptions;
    } catch (error) {
      console.error('❌ Check expired subscription error:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin subscription hiện tại của user
   * @param {string} userId - ID của user
   */
  static async getCurrentSubscription(userId) {
    try {
      const subscription = await UserSubscription.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('planId');

      return subscription;
    } catch (error) {
      console.error('❌ Get current subscription error:', error);
      throw error;
    }
  }

  /**
   * Tăng số lượng trip đã sử dụng
   * @param {string} userId - ID của user
   */
  static async incrementTripCount(userId) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (subscription) {
        subscription.current_trip_count += 1;
        await subscription.save();
        console.log(`📈 Trip count incremented for user ${userId}: ${subscription.current_trip_count}`);
      }
      
      return subscription;
    } catch (error) {
      console.error('❌ Increment trip count error:', error);
      throw error;
    }
  }

  /**
   * Tăng số lượng message đã sử dụng
   * @param {string} userId - ID của user
   */
  static async incrementMessageCount(userId) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (subscription) {
        subscription.current_message_count += 1;
        await subscription.save();
        console.log(`📈 Message count incremented for user ${userId}: ${subscription.current_message_count}`);
      }
      
      return subscription;
    } catch (error) {
      console.error('❌ Increment message count error:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra xem user có thể thực hiện hành động không
   * @param {string} userId - ID của user
   * @param {string} action - Hành động ('trip', 'message')
   */
  static async canPerformAction(userId, action) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (!subscription) {
        return { canPerform: false, reason: 'No active subscription' };
      }

      if (action === 'trip') {
        const canCreateTrip = subscription.current_trip_count < subscription.planId.trip_limit;
        return {
          canPerform: canCreateTrip,
          reason: canCreateTrip ? 'OK' : 'Trip limit exceeded',
          current: subscription.current_trip_count,
          limit: subscription.planId.trip_limit
        };
      } else if (action === 'message') {
        const canSendMessage = subscription.current_message_count < subscription.planId.message_limit;
        return {
          canPerform: canSendMessage,
          reason: canSendMessage ? 'OK' : 'Message limit exceeded',
          current: subscription.current_message_count,
          limit: subscription.planId.message_limit
        };
      }

      return { canPerform: true, reason: 'OK' };
    } catch (error) {
      console.error('❌ Check action permission error:', error);
      return { canPerform: false, reason: 'Error checking permission' };
    }
  }
}

export default SubscriptionService;



