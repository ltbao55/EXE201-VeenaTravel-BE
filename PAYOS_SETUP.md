# Hướng dẫn Setup PayOS Integration

## Vấn đề hiện tại
Lỗi "PayOS not initialized" xảy ra vì thiếu file `.env` với các biến môi trường PayOS.

## Giải pháp

### 1. Tạo file .env
Tạo file `.env` trong thư mục gốc của project với nội dung:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/veena-travel
DB_NAME=veena-travel

# Server Configuration
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# PayOS Configuration
# Lấy credentials từ https://my.payos.vn/
PAYOS_CLIENT_ID=your_payos_client_id_here
PAYOS_API_KEY=your_payos_api_key_here
PAYOS_CHECKSUM_KEY=your_payos_checksum_key_here

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=veena-travel

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Lấy PayOS Credentials
1. Truy cập https://my.payos.vn/
2. Đăng ký/đăng nhập tài khoản
3. Tạo kênh thanh toán mới
4. Lấy các thông tin:
   - `Client ID`
   - `API Key`
   - `Checksum Key`

### 3. Cập nhật file .env
Thay thế các giá trị placeholder trong file `.env`:
```env
PAYOS_CLIENT_ID=your_actual_client_id
PAYOS_API_KEY=your_actual_api_key
PAYOS_CHECKSUM_KEY=your_actual_checksum_key
```

### 4. Test PayOS Integration
Chạy script test để kiểm tra:

```bash
# Test đơn giản (không cần database)
node src/scripts/test-payos-simple.js

# Test đầy đủ (cần database)
node src/scripts/test-payos.js
```

### 5. Chạy Server
```bash
npm start
```

## API Endpoints PayOS

### Tạo link thanh toán
```
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100000,
  "description": "Thanh toán dịch vụ du lịch",
  "items": [
    {
      "name": "Gói du lịch HCM",
      "quantity": 1,
      "price": 100000
    }
  ]
}
```

### Xử lý webhook
```
POST /api/payments/webhook
Content-Type: application/json

{
  "code": "00",
  "desc": "success",
  "data": {
    "orderCode": 123456,
    "amount": 100000,
    "reference": "bank_reference"
  }
}
```

### Xử lý return URL
```
GET /api/payments/return?orderCode=123456&status=success
```

## Troubleshooting

### Lỗi "PayOS not initialized"
- Kiểm tra file `.env` có tồn tại không
- Kiểm tra các biến môi trường PayOS có được set đúng không
- Restart server sau khi cập nhật `.env`

### Lỗi "Invalid credentials"
- Kiểm tra lại PayOS credentials trên https://my.payos.vn/
- Đảm bảo đang sử dụng đúng environment (sandbox/production)

### Lỗi "Webhook signature invalid"
- Kiểm tra Checksum Key có đúng không
- Đảm bảo webhook URL được cấu hình đúng trên PayOS dashboard

## Demo PayOS
Có thể tham khảo demo PayOS trong thư mục `payos-demo-nodejs-main/` để hiểu cách tích hợp cơ bản.



