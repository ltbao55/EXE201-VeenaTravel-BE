import payOSService from '../services/payos-service.js';
import Payment from '../models/Payment.js';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';

/**
 * Script test PayOS integration
 * Chạy: node src/scripts/test-payos.js
 */

async function testPayOS() {
  console.log('🧪 Bắt đầu test PayOS integration...\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Test 1: Kiểm tra PayOS service
    console.log('\n📋 Test 1: Kiểm tra PayOS service');
    console.log('PayOS Ready:', payOSService.isReady());
    
    if (!payOSService.isReady()) {
      console.log('❌ PayOS service chưa được cấu hình');
      console.log('💡 Hãy cấu hình các biến môi trường:');
      console.log('   - PAYOS_CLIENT_ID');
      console.log('   - PAYOS_API_KEY');
      console.log('   - PAYOS_CHECKSUM_KEY');
      return;
    }

    // Test 2: Tạo order code
    console.log('\n📋 Test 2: Tạo order code');
    const orderCode = payOSService.generateOrderCode();
    console.log('Generated Order Code:', orderCode);

    // Test 3: Tạo payment link (mock data)
    console.log('\n📋 Test 3: Tạo payment link');
    const paymentData = {
      orderCode,
      amount: 100000, // 100,000 VND
      description: 'Test PayOS Integration',
      items: [
        {
          name: 'Test Product',
          quantity: 1,
          price: 100000
        }
      ],
      returnUrl: 'http://localhost:3000/payment/success',
      cancelUrl: 'http://localhost:3000/payment/cancel'
    };

    console.log('Payment Data:', JSON.stringify(paymentData, null, 2));

    const result = await payOSService.createPaymentLink(paymentData);
    
    if (result.success) {
      console.log('✅ Payment link created successfully');
      console.log('Checkout URL:', result.data.checkoutUrl);
      console.log('Payment Link ID:', result.data.paymentLinkId);
    } else {
      console.log('❌ Failed to create payment link:', result.message);
    }

    // Test 4: Tạo payment record trong database
    console.log('\n📋 Test 4: Tạo payment record');
    const payment = new Payment({
      orderCode,
      amount: 100000,
      description: 'Test PayOS Integration',
      items: paymentData.items,
      customer: {
        userId: new mongoose.Types.ObjectId(), // Mock user ID
        email: 'test@example.com',
        name: 'Test User'
      },
      paymentMethod: 'payos',
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl,
      paymentLinkId: result.data?.paymentLinkId,
      checkoutUrl: result.data?.checkoutUrl
    });

    await payment.save();
    console.log('✅ Payment record saved to database');
    console.log('Payment ID:', payment._id);

    // Test 5: Test webhook signature verification
    console.log('\n📋 Test 5: Test webhook signature');
    const mockWebhookData = {
      code: '00',
      desc: 'success',
      success: true,
      data: {
        orderCode,
        amount: 100000,
        reference: 'test_reference',
        transactionDateTime: new Date().toISOString()
      }
    };

    // Tạo mock signature (trong thực tế sẽ từ PayOS)
    const mockSignature = 'mock_signature_for_testing';
    const isValidSignature = payOSService.verifyWebhookSignature(mockWebhookData, mockSignature);
    console.log('Webhook signature valid:', isValidSignature);

    // Test 6: Test payment status update
    console.log('\n📋 Test 6: Test payment status update');
    await payment.markAsPaid({
      reference: 'test_reference',
      transactionDateTime: new Date()
    });
    console.log('✅ Payment marked as paid');
    console.log('Payment Status:', payment.status);

    // Test 7: Test cancel payment
    console.log('\n📋 Test 7: Test cancel payment');
    const cancelResult = await payOSService.cancelPaymentLink(orderCode);
    if (cancelResult.success) {
      console.log('✅ Payment cancelled successfully');
    } else {
      console.log('❌ Failed to cancel payment:', cancelResult.message);
    }

    console.log('\n🎉 PayOS integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Cấu hình PayOS credentials trong .env');
    console.log('2. Test với real PayOS sandbox');
    console.log('3. Test webhook với real PayOS webhook');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Chạy test
testPayOS().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
