import crypto from 'crypto';
import querystring from 'querystring';

/**
 * =================================================================
 * VNPAY SERVICE
 * =================================================================
 * Service xử lý tích hợp thanh toán VNPay
 * Bao gồm: Tạo URL thanh toán, xử lý IPN, Return URL, Query, Refund
 * =================================================================
 */

class VNPayService {
  constructor() {
    // Cấu hình VNPay
    this.config = {
      vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'DEMOV210',
      vnp_HashSecret: process.env.VNPAY_HASH_SECRET || 'RAOEXHYVSDDIIENYWSLDIIENYIDIE',
      vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5001/api/payments/vnpay-return',
      vnp_IpnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:5001/api/payments/vnpay-ipn',
      vnp_ApiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
    };
  }

  /**
   * Tạo URL thanh toán VNPay
   * @param {Object} paymentData - Dữ liệu thanh toán
   * @param {number} paymentData.amount - Số tiền thanh toán (VND)
   * @param {string} paymentData.orderInfo - Thông tin đơn hàng
   * @param {string} paymentData.orderType - Loại đơn hàng
   * @param {string} paymentData.txnRef - Mã tham chiếu giao dịch
   * @param {string} paymentData.bankCode - Mã ngân hàng (tùy chọn)
   * @param {string} paymentData.locale - Ngôn ngữ (vn/en)
   * @param {string} paymentData.ipAddr - IP khách hàng
   * @returns {Object} Kết quả tạo URL thanh toán
   */
  createPaymentUrl(paymentData) {
    try {
      const {
        amount,
        orderInfo,
        orderType = 'other',
        txnRef,
        bankCode = null,
        locale = 'vn',
        ipAddr = '127.0.0.1'
      } = paymentData;

      // Validate required fields
      if (!amount || !orderInfo || !txnRef) {
        return {
          success: false,
          message: 'Thiếu thông tin bắt buộc: amount, orderInfo, txnRef'
        };
      }

      const date = new Date();
      const createDate = this.formatDate(date, 'yyyymmddHHmmss');
      const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000), 'yyyymmddHHmmss'); // 15 phút

      // Tạo tham số VNPay
      const vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.config.vnp_TmnCode,
        vnp_Locale: locale,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: orderType,
        vnp_Amount: amount * 100, // Nhân 100 để loại bỏ phần thập phân
        vnp_ReturnUrl: this.config.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate
      };

      // Thêm bankCode nếu có
      if (bankCode) {
        vnp_Params.vnp_BankCode = bankCode;
      }

      // Sắp xếp tham số theo thứ tự alphabet
      const sortedParams = this.sortObject(vnp_Params);

      // Tạo chuỗi query string
      const signData = querystring.stringify(sortedParams, { encode: false });

      // Tạo chữ ký HMACSHA512
      const hmac = crypto.createHmac('sha512', this.config.vnp_HashSecret);
      const signed = hmac.update(signData, 'utf-8').digest('hex');

      // Thêm chữ ký vào tham số
      sortedParams.vnp_SecureHash = signed;

      // Tạo URL thanh toán
      const paymentUrl = this.config.vnp_Url + '?' + querystring.stringify(sortedParams, { encode: false });

      return {
        success: true,
        data: {
          paymentUrl,
          txnRef,
          amount,
          orderInfo,
          createDate,
          expireDate
        }
      };

    } catch (error) {
      console.error('VNPay createPaymentUrl error:', error);
      return {
        success: false,
        message: 'Lỗi tạo URL thanh toán: ' + error.message
      };
    }
  }

  /**
   * Xử lý IPN (Instant Payment Notification) từ VNPay
   * @param {Object} params - Tham số từ VNPay
   * @returns {Object} Kết quả xử lý IPN
   */
  processIPN(params) {
    try {
      const vnp_Params = { ...params };
      const secureHash = vnp_Params['vnp_SecureHash'];

      // Xóa các tham số không cần thiết
      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      // Sắp xếp tham số
      const sortedParams = this.sortObject(vnp_Params);

      // Tạo chuỗi query string
      const signData = querystring.stringify(sortedParams, { encode: false });

      // Tạo chữ ký để kiểm tra
      const hmac = crypto.createHmac('sha512', this.config.vnp_HashSecret);
      const signed = hmac.update(signData, 'utf-8').digest('hex');

      // Kiểm tra chữ ký
      if (secureHash !== signed) {
        return {
          success: false,
          message: 'Checksum không hợp lệ',
          rspCode: '97'
        };
      }

      // Lấy thông tin giao dịch
      const orderId = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];
      const transactionStatus = vnp_Params['vnp_TransactionStatus'];
      const transactionNo = vnp_Params['vnp_TransactionNo'];
      const amount = vnp_Params['vnp_Amount'];
      const bankCode = vnp_Params['vnp_BankCode'];
      const payDate = vnp_Params['vnp_PayDate'];

      return {
        success: true,
        data: {
          orderId,
          responseCode,
          transactionStatus,
          transactionNo,
          amount: parseInt(amount) / 100, // Chia 100 để có số tiền thực
          bankCode,
          payDate,
          rawData: vnp_Params
        },
        rspCode: '00'
      };

    } catch (error) {
      console.error('VNPay processIPN error:', error);
      return {
        success: false,
        message: 'Lỗi xử lý IPN: ' + error.message,
        rspCode: '99'
      };
    }
  }

  /**
   * Xử lý Return URL từ VNPay
   * @param {Object} params - Tham số từ VNPay
   * @returns {Object} Kết quả xử lý Return URL
   */
  processReturnUrl(params) {
    try {
      const vnp_Params = { ...params };
      const secureHash = vnp_Params['vnp_SecureHash'];

      // Xóa các tham số không cần thiết
      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      // Sắp xếp tham số
      const sortedParams = this.sortObject(vnp_Params);

      // Tạo chuỗi query string
      const signData = querystring.stringify(sortedParams, { encode: false });

      // Tạo chữ ký để kiểm tra
      const hmac = crypto.createHmac('sha512', this.config.vnp_HashSecret);
      const signed = hmac.update(signData, 'utf-8').digest('hex');

      // Kiểm tra chữ ký
      if (secureHash !== signed) {
        return {
          success: false,
          message: 'Checksum không hợp lệ',
          responseCode: '97'
        };
      }

      // Lấy thông tin giao dịch
      const orderId = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];
      const transactionStatus = vnp_Params['vnp_TransactionStatus'];

      return {
        success: true,
        data: {
          orderId,
          responseCode,
          transactionStatus,
          rawData: vnp_Params
        }
      };

    } catch (error) {
      console.error('VNPay processReturnUrl error:', error);
      return {
        success: false,
        message: 'Lỗi xử lý Return URL: ' + error.message,
        responseCode: '99'
      };
    }
  }

  /**
   * Truy vấn kết quả giao dịch
   * @param {Object} queryData - Dữ liệu truy vấn
   * @returns {Object} Kết quả truy vấn
   */
  async queryTransaction(queryData) {
    try {
      const {
        txnRef,
        transactionDate,
        ipAddr = '127.0.0.1'
      } = queryData;

      if (!txnRef || !transactionDate) {
        return {
          success: false,
          message: 'Thiếu thông tin bắt buộc: txnRef, transactionDate'
        };
      }

      const date = new Date();
      const createDate = this.formatDate(date, 'yyyymmddHHmmss');
      const requestId = this.generateRequestId();

      // Tạo tham số truy vấn
      const vnp_Params = {
        vnp_RequestId: requestId,
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: this.config.vnp_TmnCode,
        vnp_TxnRef: txnRef,
        vnp_TransactionDate: transactionDate,
        vnp_CreateDate: createDate,
        vnp_IpAddr: ipAddr,
        vnp_OrderInfo: `Truy van giao dich ${txnRef}`
      };

      // Tạo chữ ký
      const signData = this.createQuerySignData(vnp_Params);
      const hmac = crypto.createHmac('sha512', this.config.vnp_HashSecret);
      const signed = hmac.update(signData, 'utf-8').digest('hex');
      vnp_Params.vnp_SecureHash = signed;

      // Gửi request đến VNPay
      const response = await fetch(this.config.vnp_ApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vnp_Params)
      });

      const result = await response.json();

      return {
        success: result.vnp_ResponseCode === '00',
        data: result,
        message: result.vnp_Message
      };

    } catch (error) {
      console.error('VNPay queryTransaction error:', error);
      return {
        success: false,
        message: 'Lỗi truy vấn giao dịch: ' + error.message
      };
    }
  }

  /**
   * Hoàn tiền giao dịch
   * @param {Object} refundData - Dữ liệu hoàn tiền
   * @returns {Object} Kết quả hoàn tiền
   */
  async refundTransaction(refundData) {
    try {
      const {
        txnRef,
        amount,
        transactionNo,
        transactionDate,
        createBy = 'system',
        ipAddr = '127.0.0.1'
      } = refundData;

      if (!txnRef || !amount || !transactionDate) {
        return {
          success: false,
          message: 'Thiếu thông tin bắt buộc: txnRef, amount, transactionDate'
        };
      }

      const date = new Date();
      const createDate = this.formatDate(date, 'yyyymmddHHmmss');
      const requestId = this.generateRequestId();

      // Tạo tham số hoàn tiền
      const vnp_Params = {
        vnp_RequestId: requestId,
        vnp_Version: '2.1.0',
        vnp_Command: 'refund',
        vnp_TmnCode: this.config.vnp_TmnCode,
        vnp_TransactionType: '02', // Hoàn tiền toàn phần
        vnp_TxnRef: txnRef,
        vnp_Amount: amount * 100, // Nhân 100 để loại bỏ phần thập phân
        vnp_OrderInfo: `Hoan tien giao dich ${txnRef}`,
        vnp_TransactionNo: transactionNo,
        vnp_TransactionDate: transactionDate,
        vnp_CreateBy: createBy,
        vnp_CreateDate: createDate,
        vnp_IpAddr: ipAddr
      };

      // Tạo chữ ký
      const signData = this.createRefundSignData(vnp_Params);
      const hmac = crypto.createHmac('sha512', this.config.vnp_HashSecret);
      const signed = hmac.update(signData, 'utf-8').digest('hex');
      vnp_Params.vnp_SecureHash = signed;

      // Gửi request đến VNPay
      const response = await fetch(this.config.vnp_ApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vnp_Params)
      });

      const result = await response.json();

      return {
        success: result.vnp_ResponseCode === '00',
        data: result,
        message: result.vnp_Message
      };

    } catch (error) {
      console.error('VNPay refundTransaction error:', error);
      return {
        success: false,
        message: 'Lỗi hoàn tiền: ' + error.message
      };
    }
  }

  /**
   * Sắp xếp object theo thứ tự alphabet
   * @param {Object} obj - Object cần sắp xếp
   * @returns {Object} Object đã sắp xếp
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      if (obj.hasOwnProperty(key)) {
        sorted[key] = obj[key];
      }
    }
    
    return sorted;
  }

  /**
   * Format date theo định dạng VNPay
   * @param {Date} date - Ngày cần format
   * @param {string} format - Định dạng
   * @returns {string} Ngày đã format
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('yyyy', year)
      .replace('mm', month)
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Tạo Request ID duy nhất
   * @returns {string} Request ID
   */
  generateRequestId() {
    return 'REQ' + Date.now() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Tạo chuỗi dữ liệu để ký cho Query
   * @param {Object} params - Tham số
   * @returns {string} Chuỗi dữ liệu
   */
  createQuerySignData(params) {
    return [
      params.vnp_RequestId,
      params.vnp_Version,
      params.vnp_Command,
      params.vnp_TmnCode,
      params.vnp_TxnRef,
      params.vnp_TransactionDate,
      params.vnp_CreateDate,
      params.vnp_IpAddr,
      params.vnp_OrderInfo
    ].join('|');
  }

  /**
   * Tạo chuỗi dữ liệu để ký cho Refund
   * @param {Object} params - Tham số
   * @returns {string} Chuỗi dữ liệu
   */
  createRefundSignData(params) {
    return [
      params.vnp_RequestId,
      params.vnp_Version,
      params.vnp_Command,
      params.vnp_TmnCode,
      params.vnp_TransactionType,
      params.vnp_TxnRef,
      params.vnp_Amount,
      params.vnp_TransactionNo,
      params.vnp_TransactionDate,
      params.vnp_CreateBy,
      params.vnp_CreateDate,
      params.vnp_IpAddr,
      params.vnp_OrderInfo
    ].join('|');
  }

  /**
   * Lấy danh sách ngân hàng hỗ trợ
   * @returns {Object} Danh sách ngân hàng
   */
  async getBankList() {
    try {
      const response = await fetch('https://sandbox.vnpayment.vn/qrpayauth/api/merchant/get_bank_list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `tmn_code=${this.config.vnp_TmnCode}`
      });

      const result = await response.json();
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('VNPay getBankList error:', error);
      return {
        success: false,
        message: 'Lỗi lấy danh sách ngân hàng: ' + error.message
      };
    }
  }
}

export default new VNPayService();