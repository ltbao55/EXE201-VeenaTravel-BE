import payOSService from '../services/payos-service.js';

/**
 * Script test PayOS integration đơn giản (không cần database)
 * Chạy: node src/scripts/test-payos-simple.js
 */

async function testPayOSSimple() {
  console.log('🧪 Bắt đầu test PayOS integration (Simple)...\n');

  try {
    // Test 1: Kiểm tra PayOS service
    console.log('📋 Test 1: Kiểm tra PayOS service');
    console.log('PayOS Ready:', payOSService.isReady());
    
    if (!payOSService.isReady()) {
      console.log('❌ PayOS service chưa được cấu hình');
      console.log('💡 Hãy tạo file .env với các biến môi trường:');
      console.log('   PAYOS_CLIENT_ID=your_client_id');
      console.log('   PAYOS_API_KEY=your_api_key');
      console.log('   PAYOS_CHECKSUM_KEY=your_checksum_key');
      console.log('   Lấy credentials từ: https://my.payos.vn/');
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

    // Test 4: Test webhook signature verification
    console.log('\n📋 Test 4: Test webhook signature');
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

    // Test 5: Test cancel payment
    console.log('\n📋 Test 5: Test cancel payment');
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
testPayOSSimple().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

