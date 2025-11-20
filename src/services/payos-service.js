import { PayOS } from '@payos/node';
import dotenv from "dotenv";
dotenv.config();

class PayOSService {
  constructor() {
    this.payOS = null;
    this.initializePayOS();
  }

  initializePayOS() {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    console.log('🔧 Initializing PayOS service...');
    console.log('PAYOS_CLIENT_ID:', clientId ? '✅ Set' : '❌ Missing');
    console.log('PAYOS_API_KEY:', apiKey ? '✅ Set' : '❌ Missing');
    console.log('PAYOS_CHECKSUM_KEY:', checksumKey ? '✅ Set' : '❌ Missing');

    if (!clientId || !apiKey || !checksumKey) {
      console.warn('❌ PayOS credentials not configured. Payment features will be disabled.');
      console.warn('💡 Please create .env file with PayOS credentials:');
      console.warn('   PAYOS_CLIENT_ID=your_client_id');
      console.warn('   PAYOS_API_KEY=your_api_key');
      console.warn('   PAYOS_CHECKSUM_KEY=your_checksum_key');
      console.warn('   Get credentials from: https://my.payos.vn/');
      return;
    }

    try {
      this.payOS = new PayOS({
        clientId: clientId,
        apiKey: apiKey,
        checksumKey: checksumKey
      });
      console.log('✅ PayOS service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PayOS service:', error.message);
      console.error('💡 Please check your PayOS credentials in .env file');
    }
  }

  /**
   * Tạo link thanh toán
   * @param {Object} paymentData - Dữ liệu thanh toán theo CheckoutRequestType
   * @param {number} paymentData.orderCode - Mã đơn hàng
   * @param {number} paymentData.amount - Số tiền (VND)
   * @param {string} paymentData.description - Mô tả đơn hàng
   * @param {Array} paymentData.items - Danh sách sản phẩm
   * @param {string} paymentData.returnUrl - URL trả về khi thanh toán thành công
   * @param {string} paymentData.cancelUrl - URL trả về khi hủy thanh toán
   * @param {string} [paymentData.buyerName] - Tên người mua hàng
   * @param {string} [paymentData.buyerEmail] - Email người mua hàng
   * @param {string} [paymentData.buyerPhone] - Số điện thoại người mua hàng
   * @param {string} [paymentData.buyerAddress] - Địa chỉ người mua hàng
   * @param {number} [paymentData.expiredAt] - Thời gian hết hạn (timestamp)
   * @returns {Object} Kết quả tạo link thanh toán
   */
  async createPaymentLink(paymentData) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const paymentLinkResponse = await this.payOS.paymentRequests.create(paymentData);
      return {
        success: true,
        data: paymentLinkResponse,
        message: 'Payment link created successfully'
      };
    } catch (error) {
      console.error('Create payment link error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create payment link'
      };
    }
  }

  /**
   * Lấy thông tin thanh toán theo mã đơn hàng hoặc paymentLinkId
   * @param {string|number} orderId - Mã đơn hàng (number) hoặc PaymentLinkId (string)
   * @returns {Object} Thông tin thanh toán theo PaymentLinkDataType
   */
  async getPaymentInfo(orderId) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const paymentInfo = await this.payOS.paymentRequests.get(orderId);
      return {
        success: true,
        data: paymentInfo,
        message: 'Payment information retrieved successfully'
      };
    } catch (error) {
      console.error('Get payment info error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get payment information'
      };
    }
  }

  /**
   * Hủy link thanh toán
   * @param {string|number} orderId - Mã đơn hàng (number) hoặc PaymentLinkId (string)
   * @param {string} [cancellationReason] - Lý do hủy thanh toán (optional)
   * @returns {Object} Kết quả hủy thanh toán
   */
  async cancelPaymentLink(orderId, cancellationReason = null) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const result = await this.payOS.paymentRequests.cancel(orderId, cancellationReason);
      return {
        success: true,
        data: result,
        message: 'Payment link cancelled successfully'
      };
    } catch (error) {
      console.error('Cancel payment link error:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel payment link'
      };
    }
  }

  /**
   * Xác minh dữ liệu webhook từ PayOS
   * @param {Object} webhookData - Dữ liệu webhook theo WebhookType
   * @returns {Object} Dữ liệu webhook đã xác minh theo WebhookDataType
   */
  verifyPaymentWebhookData(webhookData) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      return this.payOS.webhooks.verify(webhookData);
    } catch (error) {
      console.error('Verify webhook data error:', error);
      throw error;
    }
  }

  /**
   * Xác nhận Webhook URL
   * @param {string} webhookUrl - URL webhook
   * @returns {Object} Kết quả xác nhận webhook
   */
  async confirmWebhook(webhookUrl) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const result = await this.payOS.confirmWebhook(webhookUrl);
      return {
        success: true,
        data: result,
        message: 'Webhook confirmed successfully'
      };
    } catch (error) {
      console.error('Confirm webhook error:', error);
      return {
        success: false,
        message: error.message || 'Failed to confirm webhook'
      };
    }
  }

  /**
   * Tạo mã đơn hàng duy nhất
   * @returns {number} Mã đơn hàng
   */
  generateOrderCode() {
    // Tạo mã đơn hàng 6 chữ số từ timestamp
    return parseInt(String(Date.now()).slice(-6));
  }

  /**
   * Xác minh chữ ký webhook (alias cho verifyPaymentWebhookData)
   * @param {Object} webhookData - Dữ liệu webhook
   * @param {string} signature - Chữ ký webhook
   * @returns {boolean} True nếu chữ ký hợp lệ
   */
  verifyWebhookSignature(webhookData, signature) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      // Tạo object webhook với signature để verify
      const webhookWithSignature = {
        ...webhookData,
        signature
      };
      
      const verifiedData = this.payOS.verifyPaymentWebhookData(webhookWithSignature);
      return verifiedData !== null;
    } catch (error) {
      console.error('Verify webhook signature error:', error);
      return false;
    }
  }

  /**
   * Kiểm tra xem PayOS service có sẵn sàng không
   * @returns {boolean} True nếu service sẵn sàng
   */
  isReady() {
    return this.payOS !== null;
  }
}

// Export singleton instance
export default new PayOSService();
