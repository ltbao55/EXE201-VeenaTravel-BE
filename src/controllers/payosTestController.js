import payOSService from '../services/payos-service.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

/**
 * Controller xử lý PayOS test interface
 */

// Kiểm tra trạng thái PayOS
export const checkPayOSStatus = async (req, res) => {
  try {
    const isReady = payOSService.isReady();
    
    res.json({
      success: true,
      data: {
        ready: isReady,
        message: isReady ? 'PayOS service is ready' : 'PayOS service not configured'
      }
    });
  } catch (error) {
    console.error('Check PayOS status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check PayOS status'
    });
  }
};

// Tạo link thanh toán test
export const createTestPayment = async (req, res) => {
  try {
    const {
      amount,
      description,
      items,
      customer
    } = req.body;

    // Validate required fields
    if (!amount || !description || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Amount, description, and items are required'
      });
    }

    // Check if PayOS service is ready
    if (!payOSService.isReady()) {
      return res.status(500).json({
        success: false,
        message: 'PayOS service not configured. Please check your .env file with PayOS credentials.'
      });
    }

    // Generate unique order code
    const orderCode = payOSService.generateOrderCode();

    // Create payment record
    const payment = new Payment({
      orderCode,
      amount,
      description,
      items,
      customer: {
        userId: new mongoose.Types.ObjectId(), // Mock user ID for testing
        email: customer?.email || 'test@example.com',
        phone: customer?.phone || '',
        name: customer?.name || 'Test User'
      },
      paymentMethod: 'payos',
      returnUrl: `${process.env.CLIENT_URL || 'http://localhost:5001'}/success.html`,
      cancelUrl: `${process.env.CLIENT_URL || 'http://localhost:5001'}/cancel.html`
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
      message: 'Test payment link created successfully',
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
    console.error('Create test payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test payment'
    });
  }
};

// Xử lý return URL (thanh toán thành công)
export const handleTestPaymentReturn = async (req, res) => {
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

    // Redirect to appropriate page
    if (status === 'success') {
      res.redirect(`/success.html?orderCode=${orderCode}&amount=${payment.amount}&status=success`);
    } else {
      res.redirect(`/cancel.html?orderCode=${orderCode}&amount=${payment.amount}&status=cancel`);
    }

  } catch (error) {
    console.error('Handle test payment return error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle payment return'
    });
  }
};

// Xử lý webhook từ PayOS (test)
export const handleTestWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('📨 Received PayOS test webhook:', JSON.stringify(webhookData, null, 2));

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
      paymentLinkId
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
      currency: currency || 'VND'
    };

    await payment.markAsPaid(transactionInfo);
    await payment.updateWebhookData(webhookData, webhookData.signature);

    console.log(`✅ Test Payment ${orderCode} marked as paid via webhook`);
    console.log(`💰 Amount: ${amount} ${currency || 'VND'}`);

    // Return success response (PayOS expects 2XX status)
    res.status(200).json({
      success: true,
      message: 'Test webhook processed successfully',
      data: {
        orderCode,
        status: 'paid',
        amount,
        currency: currency || 'VND'
      }
    });

  } catch (error) {
    console.error('❌ Handle test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process test webhook',
      error: error.message
    });
  }
};

// Lấy thông tin thanh toán test
export const getTestPaymentInfo = async (req, res) => {
  try {
    const { orderCode } = req.params;

    const payment = await Payment.findByOrderCode(parseInt(orderCode));

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get test payment info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment information'
    });
  }
};
