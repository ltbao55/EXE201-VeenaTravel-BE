import Payment from '../models/Payment.js';
import vnpayService from '../services/vnpay-service.js';
import User from '../models/User.js';

// Tạo URL thanh toán VNPAY
export const createPaymentUrl = async (req, res) => {
  try {
    const {
      amount,
      orderInfo,
      orderType = 'other',
      bankCode = '',
      locale = 'vn',
      expireMinutes = 15
    } = req.body;

    // Validate required fields
    if (!amount || !orderInfo) {
      return res.status(400).json({
        success: false,
        message: 'Amount and orderInfo are required'
      });
    }

    // Get user info
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique transaction reference
    const txnRef = vnpayService.generateTxnRef();

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.connection.socket.remoteAddress;

    // Create expire date
    const expireDate = new Date(Date.now() + expireMinutes * 60 * 1000);

    // Create payment record
    const payment = new Payment({
      orderCode: parseInt(txnRef.replace('VNP', '')),
      amount,
      description: orderInfo,
      items: [{
        name: orderInfo,
        quantity: 1,
        price: amount
      }],
      customer: {
        userId: req.user._id,
        email: user.email,
        phone: user.phone,
        name: user.name
      },
      paymentMethod: 'vnpay',
      metadata: {
        txnRef,
        orderType,
        bankCode,
        locale,
        expireMinutes
      }
    });

    await payment.save();

    // Create VNPAY payment URL
    const result = vnpayService.createPaymentUrl({
      amount,
      orderInfo,
      orderType,
      txnRef,
      bankCode,
      locale,
      ipAddr,
      expireDate
    });

    if (!result.success) {
      await Payment.findByIdAndDelete(payment._id);
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Update payment with VNPAY data
    payment.metadata.paymentUrl = result.data.paymentUrl;
    payment.metadata.createDate = result.data.createDate;
    payment.metadata.expireDate = result.data.expireDate;
    await payment.save();

    res.json({
      success: true,
      message: 'VNPAY payment URL created successfully',
      data: {
        paymentUrl: result.data.paymentUrl,
        txnRef: result.data.txnRef,
        amount: result.data.amount,
        orderInfo: result.data.orderInfo,
        createDate: result.data.createDate,
        expireDate: result.data.expireDate,
        paymentId: payment._id
      }
    });

  } catch (error) {
    console.error('Create VNPAY payment URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create VNPAY payment URL'
    });
  }
};

// Xử lý Return URL từ VNPAY
export const handleReturnUrl = async (req, res) => {
  try {
    const vnpParams = req.query;

    // Verify checksum
    if (!vnpayService.verifyChecksum(vnpParams)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid checksum'
      });
    }

    const {
      vnp_ResponseCode,
      vnp_TransactionStatus,
      vnp_TxnRef,
      vnp_Amount,
      vnp_TransactionNo,
      vnp_PayDate,
      vnp_BankCode,
      vnp_CardType
    } = vnpParams;

    // Find payment record
    const payment = await Payment.findOne({
      'metadata.txnRef': vnp_TxnRef
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status based on VNPAY response
    if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
      // Payment successful
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.transactionInfo = {
        ...payment.transactionInfo,
        vnpTransactionNo: vnp_TransactionNo,
        vnpPayDate: vnp_PayDate,
        vnpBankCode: vnp_BankCode,
        vnpCardType: vnp_CardType,
        vnpResponseCode: vnp_ResponseCode,
        vnpTransactionStatus: vnp_TransactionStatus
      };
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.transactionInfo = {
        ...payment.transactionInfo,
        vnpResponseCode: vnp_ResponseCode,
        vnpTransactionStatus: vnp_TransactionStatus,
        errorMessage: getErrorMessage(vnp_ResponseCode)
      };
    }

    await payment.save();

    // Redirect to frontend with result
    const frontendUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/result?status=${payment.status}&txnRef=${vnp_TxnRef}`;
    
    res.redirect(frontendUrl);

  } catch (error) {
    console.error('Handle VNPAY return URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle return URL'
    });
  }
};

// Xử lý IPN URL từ VNPAY
export const handleIpnUrl = async (req, res) => {
  try {
    const vnpParams = req.query;

    // Verify checksum
    if (!vnpayService.verifyChecksum(vnpParams)) {
      return res.status(200).json({
        RspCode: '97',
        Message: 'Fail checksum'
      });
    }

    const {
      vnp_ResponseCode,
      vnp_TransactionStatus,
      vnp_TxnRef,
      vnp_Amount,
      vnp_TransactionNo,
      vnp_PayDate,
      vnp_BankCode,
      vnp_CardType,
      vnp_BankTranNo
    } = vnpParams;

    // Find payment record
    const payment = await Payment.findOne({
      'metadata.txnRef': vnp_TxnRef
    });

    if (!payment) {
      return res.status(200).json({
        RspCode: '01',
        Message: 'Order not found'
      });
    }

    // Check if payment is already processed
    if (payment.status === 'paid' && payment.transactionInfo?.vnpTransactionNo) {
      return res.status(200).json({
        RspCode: '02',
        Message: 'Order already processed'
      });
    }

    // Update payment status
    if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
      // Payment successful
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.transactionInfo = {
        ...payment.transactionInfo,
        vnpTransactionNo: vnp_TransactionNo,
        vnpPayDate: vnp_PayDate,
        vnpBankCode: vnp_BankCode,
        vnpCardType: vnp_CardType,
        vnpBankTranNo: vnp_BankTranNo,
        vnpResponseCode: vnp_ResponseCode,
        vnpTransactionStatus: vnp_TransactionStatus
      };

      await payment.save();

      return res.status(200).json({
        RspCode: '00',
        Message: 'success'
      });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.transactionInfo = {
        ...payment.transactionInfo,
        vnpResponseCode: vnp_ResponseCode,
        vnpTransactionStatus: vnp_TransactionStatus,
        errorMessage: getErrorMessage(vnp_ResponseCode)
      };

      await payment.save();

      return res.status(200).json({
        RspCode: '00',
        Message: 'Order updated'
      });
    }

  } catch (error) {
    console.error('Handle VNPAY IPN URL error:', error);
    return res.status(200).json({
      RspCode: '99',
      Message: 'Unknown error'
    });
  }
};

// Truy vấn kết quả giao dịch
export const queryTransaction = async (req, res) => {
  try {
    const { txnRef, transactionDate } = req.body;

    if (!txnRef || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'txnRef and transactionDate are required'
      });
    }

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.connection.socket.remoteAddress;

    const result = await vnpayService.queryTransaction({
      txnRef,
      transactionDate,
      ipAddr
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Transaction queried successfully'
    });

  } catch (error) {
    console.error('Query VNPAY transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query transaction'
    });
  }
};

// Tạo yêu cầu hoàn tiền
export const createRefund = async (req, res) => {
  try {
    const {
      txnRef,
      amount,
      orderInfo = 'Hoan tien giao dich',
      createBy
    } = req.body;

    if (!txnRef || !amount) {
      return res.status(400).json({
        success: false,
        message: 'txnRef and amount are required'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({
      'metadata.txnRef': txnRef
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not eligible for refund'
      });
    }

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.connection.socket.remoteAddress;

    const result = await vnpayService.createRefund({
      txnRef,
      amount,
      transactionNo: payment.transactionInfo?.vnpTransactionNo,
      transactionDate: payment.transactionInfo?.vnpPayDate,
      orderInfo,
      createBy: createBy || req.user?.name || 'System',
      ipAddr
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Update payment status
    payment.status = 'refunded';
    payment.metadata.refundData = result.data;
    await payment.save();

    res.json({
      success: true,
      data: result.data,
      message: 'Refund request created successfully'
    });

  } catch (error) {
    console.error('Create VNPAY refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create refund'
    });
  }
};

// Lấy danh sách ngân hàng
export const getBankList = async (req, res) => {
  try {
    const result = await vnpayService.getBankList();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Bank list retrieved successfully'
    });

  } catch (error) {
    console.error('Get VNPAY bank list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bank list'
    });
  }
};

// Lấy thông tin giao dịch VNPAY
export const getTransactionInfo = async (req, res) => {
  try {
    const { txnRef } = req.params;

    const payment = await Payment.findOne({
      'metadata.txnRef': txnRef
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user has permission to view this transaction
    if (payment.customer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: payment,
      message: 'Transaction information retrieved successfully'
    });

  } catch (error) {
    console.error('Get VNPAY transaction info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction information'
    });
  }
};

// Helper function to get error message from response code
function getErrorMessage(responseCode) {
  const errorMessages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
    '24': 'Khách hàng hủy giao dịch',
    '51': 'Tài khoản không đủ số dư',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Các lỗi khác'
  };

  return errorMessages[responseCode] || 'Lỗi không xác định';
}
