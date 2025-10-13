import PayOS from '@payos/node';
import crypto from 'crypto';

class PayOSService {
  constructor() {
    this.payOS = null;
    this.initializePayOS();
  }

  initializePayOS() {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      console.warn('PayOS credentials not configured. Payment features will be disabled.');
      return;
    }

    try {
      this.payOS = new PayOS(clientId, apiKey, checksumKey);
      console.log('✅ PayOS service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PayOS service:', error.message);
    }
  }

  /**
   * Tạo link thanh toán
   * @param {Object} paymentData - Dữ liệu thanh toán
   * @param {number} paymentData.orderCode - Mã đơn hàng
   * @param {number} paymentData.amount - Số tiền (VND)
   * @param {string} paymentData.description - Mô tả đơn hàng
   * @param {Array} paymentData.items - Danh sách sản phẩm
   * @param {string} paymentData.returnUrl - URL trả về khi thanh toán thành công
   * @param {string} paymentData.cancelUrl - URL trả về khi hủy thanh toán
   * @returns {Object} Kết quả tạo link thanh toán
   */
  async createPaymentLink(paymentData) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const paymentLinkResponse = await this.payOS.createPaymentLink(paymentData);
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
   * Lấy thông tin thanh toán theo mã đơn hàng
   * @param {number} orderCode - Mã đơn hàng
   * @returns {Object} Thông tin thanh toán
   */
  async getPaymentInfo(orderCode) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const paymentInfo = await this.payOS.getPaymentLinkInformation(orderCode);
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
   * @param {number} orderCode - Mã đơn hàng
   * @returns {Object} Kết quả hủy thanh toán
   */
  async cancelPaymentLink(orderCode) {
    if (!this.payOS) {
      throw new Error('PayOS service not initialized');
    }

    try {
      const result = await this.payOS.cancelPaymentLink(orderCode);
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
   * Xác thực webhook signature
   * @param {Object} webhookData - Dữ liệu webhook
   * @param {string} signature - Chữ ký từ webhook
   * @returns {boolean} True nếu signature hợp lệ
   */
  verifyWebhookSignature(webhookData, signature) {
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!checksumKey) {
      console.error('PayOS checksum key not configured');
      return false;
    }

    try {
      // Tạo signature từ dữ liệu webhook
      const dataString = JSON.stringify(webhookData);
      const expectedSignature = crypto
        .createHmac('sha256', checksumKey)
        .update(dataString)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Verify webhook signature error:', error);
      return false;
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
   * Kiểm tra xem PayOS service có sẵn sàng không
   * @returns {boolean} True nếu service sẵn sàng
   */
  isReady() {
    return this.payOS !== null;
  }
}

// Export singleton instance
export default new PayOSService();
