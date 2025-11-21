import Payment from '../models/Payment.js';
import payOSService from '../services/payos-service.js';
import User from '../models/User.js';
import SubscriptionService from '../services/subscription-service.js';

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

    // Get user info từ authentication
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine server and client base URLs
    const serverUrlRaw =
      process.env.SERVER_URL ||
      process.env.API_BASE_URL ||
      (req?.headers?.host ? `https://${req.headers.host}` : null) ||
      'http://localhost:5001';
    const serverUrl = serverUrlRaw.replace(/\/$/, '');

    // Create payment record
    const payment = new Payment({
      orderCode,
      amount,
      description,
      items,
      customer: {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name
      },
      metadata,
      returnUrl: `${serverUrl}/api/payments/return?status=success&orderCode=${orderCode}`,
      cancelUrl: `${serverUrl}/api/payments/return?status=cancel&orderCode=${orderCode}`
    });

    await payment.save();

    // Create PayOS payment link
    // PayOS yêu cầu description tối đa 25 ký tự
    const shortDescription = description.length > 25 ? description.substring(0, 22) + '...' : description;
    
    const paymentData = {
      orderCode,
      amount,
      description: shortDescription,
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
    const { orderCode } = req.query;
    const rawStatus = req.query.status;
    const normalizedStatus = String(rawStatus || '').trim().toLowerCase();

    // Xác định FE URL để redirect (đặt ở đây để dùng trong cả error cases)
    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      process.env.CLIENT_ORIGIN ||
      'http://localhost:5173';
    
    if (!orderCode) {
      console.error('❌ Payment return: Order code is required');
      return res.redirect(`${clientUrl}/?payment=error&message=order_code_required`);
    }

    const payment = await Payment.findByOrderCode(parseInt(orderCode));

    if (!payment) {
      console.error(`❌ Payment return: Payment not found for orderCode ${orderCode}`);
      return res.redirect(`${clientUrl}/?payment=error&message=payment_not_found&orderCode=${orderCode}`);
    }

    // Update payment status based on return status (normalize common variants)
    const isSuccessStatus = ['success', 'paid', 'succeeded', 'completed'].includes(normalizedStatus);
    const isCancelStatus = ['cancel', 'cancelled', 'canceled', 'failed'].includes(normalizedStatus) || String(req.query.cancel).toLowerCase() === 'true';
    
    if (isSuccessStatus) {
      await payment.markAsPaid();
      
      // Tạo hoặc cập nhật subscription sau khi thanh toán thành công
      try {
        if (payment.customer && payment.customer.userId) {
          const subscription = await SubscriptionService.createOrUpdateSubscription(
            payment.customer.userId,
            payment._id,
            {
              amount: payment.amount,
              metadata: payment.metadata
            }
          );
          
          console.log(`🎉 Subscription created/updated for user ${payment.customer.userId}`);
          console.log(`📋 Plan: ${subscription.planId.name} (${subscription.planId.type})`);
        } else {
          console.log('⚠️ No user ID found in payment, skipping subscription creation');
        }
      } catch (subscriptionError) {
        console.error('❌ Subscription creation error:', subscriptionError);
        // Vẫn redirect về FE dù có lỗi subscription để user biết payment đã thành công
      }
      
      // ✅ Redirect về FE trang chủ sau khi đã cập nhật xong
      return res.redirect(`${clientUrl}/?payment=success&orderCode=${payment.orderCode}`);
      
    } else if (isCancelStatus) {
      await payment.markAsCancelled();
      
      // ✅ Redirect về FE với thông báo cancel
      return res.redirect(`${clientUrl}/?payment=cancelled&orderCode=${payment.orderCode}`);
    }

    // Nếu status không rõ ràng, vẫn redirect về FE (PayOS có thể gửi status khác)
    return res.redirect(`${clientUrl}/?payment=unknown&orderCode=${payment.orderCode}`);

  } catch (error) {
    console.error('Handle payment return error:', error);
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/?payment=error&message=server_error`);
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

    // Tạo hoặc cập nhật subscription sau khi thanh toán thành công
    try {
      if (payment.customer && payment.customer.userId) {
        const subscription = await SubscriptionService.createOrUpdateSubscription(
          payment.customer.userId,
          payment._id,
          {
            amount: payment.amount,
            metadata: payment.metadata
          }
        );
        
        console.log(`🎉 Subscription created/updated for user ${payment.customer.userId}`);
        console.log(`📋 Plan: ${subscription.planId.name} (${subscription.planId.type})`);
        console.log(`📅 Valid until: ${subscription.endDate}`);
      } else {
        console.log('⚠️ No user ID found in payment, skipping subscription creation');
      }
    } catch (subscriptionError) {
      console.error('❌ Subscription creation error:', subscriptionError);
      // Không fail webhook vì payment đã được xử lý thành công
    }

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
