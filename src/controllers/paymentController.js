import Payment from '../models/Payment.js';
import payOSService from '../services/payos-service.js';
import vnpayService from '../services/vnpay-service.js';
import User from '../models/User.js';
import querystring from 'querystring';

// Tạo link thanh toán
export const createPaymentLink = async (req, res) => {
  try {
    const {
      amount,
      description,
      items,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!amount || !description || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Amount, description, and items are required'
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have name, quantity, and price'
        });
      }
    }

    // Generate unique order code
    const orderCode = payOSService.generateOrderCode();

    // Get user info
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create payment record
    const payment = new Payment({
      orderCode,
      amount,
      description,
      items,
      customer: {
        userId: req.user._id,
        email: user.email,
        phone: user.phone,
        name: user.name
      },
      metadata,
      returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success`,
      cancelUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/cancel`
    });

    await payment.save();

    // Create PayOS payment link
    const paymentData = {
      orderCode,
      amount,
      description,
      items,
      returnUrl: payment.returnUrl,
      cancelUrl: payment.cancelUrl
    };

    const result = await payOSService.createPaymentLink(paymentData);

    if (!result.success) {
      await Payment.findByIdAndDelete(payment._id);
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Update payment with PayOS data
    payment.paymentLinkId = result.data.paymentLinkId;
    payment.checkoutUrl = result.data.checkoutUrl;
    await payment.save();

    res.json({
      success: true,
      message: 'Payment link created successfully',
      data: {
        orderCode: payment.orderCode,
        checkoutUrl: payment.checkoutUrl,
        amount: payment.amount,
        description: payment.description,
        expiresAt: payment.expiresAt,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Create payment link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment link'
    });
  }
};

// Lấy thông tin thanh toán
export const getPaymentInfo = async (req, res) => {
  try {
    const { orderCode } = req.params;

    const payment = await Payment.findByOrderCode(parseInt(orderCode));

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has permission to view this payment
    if (payment.customer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment information'
    });
  }
};

// Lấy danh sách thanh toán của user
export const getUserPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { 'customer.userId': req.user._id };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user payments'
    });
  }
};

// Hủy thanh toán
export const cancelPayment = async (req, res) => {
  try {
    const { orderCode } = req.params;

    const payment = await Payment.findByOrderCode(parseInt(orderCode));

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has permission to cancel this payment
    if (payment.customer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if payment can be cancelled
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be cancelled'
      });
    }

    // Cancel payment in PayOS
    const result = await payOSService.cancelPaymentLink(payment.orderCode);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Update payment status
    await payment.markAsCancelled();

    res.json({
      success: true,
      message: 'Payment cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel payment'
    });
  }
};

// Xử lý return URL (thanh toán thành công)
export const handlePaymentReturn = async (req, res) => {
  try {
    const { orderCode, status } = req.query;

    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: 'Order code is required'
      });
    }

    const payment = await Payment.findByOrderCode(parseInt(orderCode));

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status based on return status
    if (status === 'success') {
      await payment.markAsPaid();
    } else if (status === 'cancel') {
      await payment.markAsCancelled();
    }

    res.json({
      success: true,
      message: 'Payment status updated',
      data: {
        orderCode: payment.orderCode,
        status: payment.status,
        amount: payment.amount,
        description: payment.description
      }
    });

  } catch (error) {
    console.error('Handle payment return error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle payment return'
    });
  }
};

// Xử lý webhook từ PayOS
export const handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-payos-signature'];

    // Verify webhook signature
    if (!payOSService.verifyWebhookSignature(webhookData, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { code, desc, success, data } = webhookData;

    if (!success || code !== '00') {
      console.error('Webhook error:', desc);
      return res.status(400).json({
        success: false,
        message: desc
      });
    }

    const { orderCode, amount, reference, transactionDateTime } = data;

    // Find payment record
    const payment = await Payment.findByOrderCode(orderCode);

    if (!payment) {
      console.error('Payment not found for order code:', orderCode);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment with transaction info
    const transactionInfo = {
      reference,
      transactionDateTime: new Date(transactionDateTime),
      ...data
    };

    await payment.markAsPaid(transactionInfo);
    await payment.updateWebhookData(webhookData, signature);

    console.log(`Payment ${orderCode} marked as paid via webhook`);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Handle webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook'
    });
  }
};

// =============== VNPAY METHODS ===============

// Tạo URL thanh toán VNPay
export const createVNPayPaymentUrl = async (req, res) => {
  try {
    const {
      amount,
      orderInfo,
      orderType = 'other',
      bankCode = null,
      locale = 'vn'
    } = req.body;

    // Validate required fields
    if (!amount || !orderInfo) {
      return res.status(400).json({
        success: false,
        message: 'Amount và orderInfo là bắt buộc'
      });
    }

    // Generate unique order code
    const orderCode = Date.now();
    const txnRef = `TXN${orderCode}`;

    // Get user info
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create payment record
    const payment = new Payment({
      orderCode,
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
      returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/vnpay-return`,
      cancelUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/vnpay-cancel`
    });

    await payment.save();

    // Create VNPay payment URL
    const paymentData = {
      amount,
      orderInfo,
      orderType,
      txnRef,
      bankCode,
      locale,
      ipAddr: req.ip || req.connection.remoteAddress || '127.0.0.1'
    };

    const result = await vnpayService.createPaymentUrl(paymentData);

    if (!result.success) {
      await Payment.findByIdAndDelete(payment._id);
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    // Update payment with VNPay data
    payment.transactionInfo.vnpTxnRef = txnRef;
    payment.transactionInfo.vnpAmount = amount * 100;
    payment.transactionInfo.vnpOrderInfo = orderInfo;
    await payment.save();

    res.json({
      success: true,
      message: 'VNPay payment URL created successfully',
      data: {
        orderCode: payment.orderCode,
        paymentUrl: result.data.paymentUrl,
        txnRef: result.data.txnRef,
        amount: payment.amount,
        description: payment.description,
        expiresAt: payment.expiresAt,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Create VNPay payment URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create VNPay payment URL'
    });
  }
};

// Xử lý Return URL từ VNPay
export const handleVNPayReturn = async (req, res) => {
  try {
    const result = vnpayService.processReturnUrl(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        responseCode: result.responseCode
      });
    }

    const { orderId, responseCode, transactionStatus } = result.data;

    // Find payment record
    const payment = await Payment.findOne({ 
      'transactionInfo.vnpTxnRef': orderId 
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status based on VNPay response
    if (responseCode === '00' && transactionStatus === '00') {
      await payment.markAsPaid({
        vnpResponseCode: responseCode,
        vnpTransactionStatus: transactionStatus,
        ...result.data.rawData
      });
    } else {
      await payment.markAsFailed();
      payment.transactionInfo.errorMessage = `VNPay Error: ${responseCode}`;
      await payment.save();
    }

    // Redirect to frontend with result
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/result?` + 
      querystring.stringify({
        success: responseCode === '00' && transactionStatus === '00',
        orderCode: payment.orderCode,
        message: responseCode === '00' && transactionStatus === '00' ? 'Thanh toán thành công' : 'Thanh toán thất bại'
      });

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Handle VNPay return error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle VNPay return'
    });
  }
};

// Xử lý IPN từ VNPay
export const handleVNPayIPN = async (req, res) => {
  try {
    const result = vnpayService.processIPN(req.query);

    if (!result.success) {
      return res.status(200).json({
        RspCode: result.rspCode || '97',
        Message: result.message
      });
    }

    const { orderId, responseCode, transactionStatus, transactionNo, amount, bankCode, payDate } = result.data;

    // Find payment record
    const payment = await Payment.findOne({ 
      'transactionInfo.vnpTxnRef': orderId 
    });

    if (!payment) {
      return res.status(200).json({
        RspCode: '01',
        Message: 'Payment not found'
      });
    }

    // Update payment with VNPay transaction info
    if (responseCode === '00' && transactionStatus === '00') {
      await payment.markAsPaid({
        vnpTransactionNo: transactionNo,
        vnpPayDate: payDate,
        vnpBankCode: bankCode,
        vnpResponseCode: responseCode,
        vnpTransactionStatus: transactionStatus,
        vnpAmount: amount * 100,
        ...result.data.rawData
      });
    } else {
      await payment.markAsFailed();
      payment.transactionInfo.errorMessage = `VNPay Error: ${responseCode}`;
      await payment.save();
    }

    res.status(200).json({
      RspCode: '00',
      Message: 'Success'
    });

  } catch (error) {
    console.error('Handle VNPay IPN error:', error);
    res.status(200).json({
      RspCode: '99',
      Message: 'Internal error'
    });
  }
};

// Truy vấn giao dịch VNPay
export const queryVNPayTransaction = async (req, res) => {
  try {
    const { txnRef, transactionDate } = req.body;

    if (!txnRef || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'txnRef và transactionDate là bắt buộc'
      });
    }

    const result = await vnpayService.queryTransaction({
      txnRef,
      transactionDate,
      ipAddr: req.ip || req.connection.remoteAddress || '127.0.0.1'
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Query VNPay transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query VNPay transaction'
    });
  }
};

// Hoàn tiền VNPay
export const refundVNPayTransaction = async (req, res) => {
  try {
    const { txnRef, amount, transactionNo, transactionDate, createBy } = req.body;

    if (!txnRef || !amount || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'txnRef, amount và transactionDate là bắt buộc'
      });
    }

    const result = await vnpayService.refundTransaction({
      txnRef,
      amount,
      transactionNo,
      transactionDate,
      createBy: createBy || 'admin',
      ipAddr: req.ip || req.connection.remoteAddress || '127.0.0.1'
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Refund VNPay transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refund VNPay transaction'
    });
  }
};

// Lấy danh sách ngân hàng VNPay
export const getVNPayBankList = async (req, res) => {
  try {
    const result = await vnpayService.getBankList();

    res.json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get VNPay bank list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VNPay bank list'
    });
  }
};

// Lấy thống kê thanh toán (Admin only)
export const getPaymentStats = async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const paidPayments = await Payment.countDocuments({ status: 'paid' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const cancelledPayments = await Payment.countDocuments({ status: 'cancelled' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    const totalAmount = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyStats = await Payment.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        totalPayments,
        paidPayments,
        pendingPayments,
        cancelledPayments,
        failedPayments,
        totalAmount: totalAmount[0]?.total || 0,
        monthlyStats
      }
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics'
    });
  }
};
