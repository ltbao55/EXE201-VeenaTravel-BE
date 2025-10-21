import Payment from '../models/Payment.js';
import payOSService from '../services/payos-service.js';
import User from '../models/User.js';

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

    // Check if PayOS service is ready
    if (!payOSService.isReady()) {
      await Payment.findByIdAndDelete(payment._id);
      return res.status(500).json({
        success: false,
        message: 'PayOS service not configured. Please create .env file with: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY. Get credentials from https://my.payos.vn/'
      });
    }

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
    console.log('📨 Received PayOS webhook:', JSON.stringify(webhookData, null, 2));

    // Verify webhook data using PayOS SDK
    const verifiedData = payOSService.verifyPaymentWebhookData(webhookData);

    const { 
      orderCode, 
      amount, 
      reference, 
      transactionDateTime, 
      accountNumber, 
      description,
      currency,
      paymentLinkId,
      code,
      desc,
      counterAccountBankId,
      counterAccountBankName,
      counterAccountName,
      counterAccountNumber,
      virtualAccountName,
      virtualAccountNumber
    } = verifiedData;

    // Find payment record
    const payment = await Payment.findByOrderCode(orderCode);

    if (!payment) {
      console.error('❌ Payment not found for order code:', orderCode);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment is already processed
    if (payment.status === 'paid') {
      console.log('✅ Payment already processed:', orderCode);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed'
      });
    }

    // Update payment with transaction info
    const transactionInfo = {
      reference,
      transactionDateTime: new Date(transactionDateTime),
      accountNumber,
      currency,
      counterAccountBankId,
      counterAccountBankName,
      counterAccountName,
      counterAccountNumber,
      virtualAccountName,
      virtualAccountNumber
    };

    await payment.markAsPaid(transactionInfo);
    await payment.updateWebhookData(webhookData, webhookData.signature);

    console.log(`✅ Payment ${orderCode} marked as paid via webhook`);
    console.log(`💰 Amount: ${amount} ${currency}`);
    console.log(`🏦 Bank: ${counterAccountBankName || 'N/A'}`);
    console.log(`👤 Payer: ${counterAccountName || 'N/A'}`);

    // Return success response (PayOS expects 2XX status)
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        orderCode,
        status: 'paid',
        amount,
        currency
      }
    });

  } catch (error) {
    console.error('❌ Handle webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
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
