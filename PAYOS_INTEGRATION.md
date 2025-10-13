# PayOS Integration - Veena Travel

## Tổng quan

Hệ thống đã được tích hợp PayOS để xử lý thanh toán trực tuyến. PayOS hỗ trợ thanh toán qua VietQR và các phương thức thanh toán khác.

## Cấu hình

### 1. Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# PayOS Configuration
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
CLIENT_URL=http://localhost:3000
```

### 2. Lấy thông tin PayOS

1. Đăng ký tài khoản tại [payOS](https://my.payos.vn)
2. Tạo kênh thanh toán
3. Lấy `Client ID`, `API Key`, và `Checksum Key` từ dashboard

## API Endpoints

### 1. Tạo link thanh toán

**POST** `/api/payments/create`

```json
{
  "amount": 200000,
  "description": "Thanh toán tour du lịch",
  "items": [
    {
      "name": "Tour Đà Lạt 3 ngày 2 đêm",
      "quantity": 1,
      "price": 200000
    }
  ],
  "metadata": {
    "tourId": "tour123",
    "bookingId": "booking456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "orderCode": 123456,
    "checkoutUrl": "https://payos.vn/web/...",
    "amount": 200000,
    "description": "Thanh toán tour du lịch",
    "expiresAt": "2024-01-01T12:00:00.000Z",
    "status": "pending"
  }
}
```

### 2. Lấy thông tin thanh toán

**GET** `/api/payments/info/:orderCode`

**Response:**
```json
{
  "success": true,
  "data": {
    "orderCode": 123456,
    "amount": 200000,
    "status": "paid",
    "customer": {
      "userId": "user123",
      "email": "user@example.com"
    },
    "transactionInfo": {
      "reference": "TF230204212323",
      "transactionDateTime": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### 3. Lấy danh sách thanh toán của user

**GET** `/api/payments/user-payments?page=1&limit=10&status=paid`

**Query Parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số lượng mỗi trang (default: 10)
- `status`: Trạng thái thanh toán (pending, paid, cancelled, failed)

### 4. Hủy thanh toán

**POST** `/api/payments/cancel/:orderCode`

### 5. Xử lý return URL

**GET** `/api/payments/return?orderCode=123456&status=success`

### 6. Webhook (PayOS → Server)

**POST** `/api/payments/webhook`

Webhook này được PayOS gọi để thông báo kết quả thanh toán.

## Luồng thanh toán

1. **Tạo thanh toán**: Client gọi API tạo link thanh toán
2. **Chuyển hướng**: Client chuyển hướng user đến `checkoutUrl`
3. **Thanh toán**: User thanh toán trên trang PayOS
4. **Return**: PayOS chuyển hướng về `returnUrl`
5. **Webhook**: PayOS gửi webhook để cập nhật trạng thái
6. **Hoàn thành**: Hệ thống cập nhật trạng thái thanh toán

## Models

### Payment Model

```javascript
{
  orderCode: Number,        // Mã đơn hàng duy nhất
  amount: Number,           // Số tiền (VND)
  description: String,       // Mô tả đơn hàng
  status: String,           // pending, paid, cancelled, failed, expired
  items: Array,             // Danh sách sản phẩm
  customer: {
    userId: ObjectId,       // ID user
    email: String,          // Email user
    phone: String,          // Số điện thoại
    name: String           // Tên user
  },
  paymentLinkId: String,     // ID link thanh toán từ PayOS
  checkoutUrl: String,      // URL thanh toán
  transactionInfo: Object,  // Thông tin giao dịch
  webhookData: Object,     // Dữ liệu webhook
  expiresAt: Date,         // Thời gian hết hạn
  paidAt: Date,            // Thời gian thanh toán
  cancelledAt: Date        // Thời gian hủy
}
```

## Services

### PayOSService

- `createPaymentLink(paymentData)`: Tạo link thanh toán
- `getPaymentInfo(orderCode)`: Lấy thông tin thanh toán
- `cancelPaymentLink(orderCode)`: Hủy link thanh toán
- `verifyWebhookSignature(webhookData, signature)`: Xác thực webhook
- `generateOrderCode()`: Tạo mã đơn hàng duy nhất
- `isReady()`: Kiểm tra service có sẵn sàng

## Bảo mật

1. **Webhook Signature**: Tất cả webhook đều được xác thực signature
2. **Authentication**: Các API cần authentication (trừ webhook và return)
3. **Rate Limiting**: Áp dụng rate limiting cho tất cả API
4. **Validation**: Validate tất cả input data

## Testing

### Test tạo thanh toán

```bash
curl -X POST http://localhost:5001/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 200000,
    "description": "Test payment",
    "items": [
      {
        "name": "Test item",
        "quantity": 1,
        "price": 200000
      }
    ]
  }'
```

### Test webhook

```bash
curl -X POST http://localhost:5001/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-payos-signature: SIGNATURE" \
  -d '{
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "orderCode": 123456,
      "amount": 200000,
      "reference": "TF230204212323"
    }
  }'
```

## Lưu ý

1. **Environment**: Đảm bảo cấu hình đúng các biến môi trường
2. **Webhook URL**: Cấu hình webhook URL trên PayOS dashboard
3. **Return URLs**: Cấu hình return và cancel URLs phù hợp
4. **Error Handling**: Xử lý các lỗi có thể xảy ra
5. **Logging**: Log tất cả các hoạt động thanh toán để debug

## Troubleshooting

### Lỗi thường gặp

1. **PayOS service not initialized**: Kiểm tra environment variables
2. **Invalid signature**: Kiểm tra checksum key
3. **Payment not found**: Kiểm tra orderCode
4. **Access denied**: Kiểm tra authentication

### Debug

```javascript
// Kiểm tra PayOS service
console.log(payOSService.isReady());

// Kiểm tra webhook signature
const isValid = payOSService.verifyWebhookSignature(data, signature);
console.log('Signature valid:', isValid);
```
