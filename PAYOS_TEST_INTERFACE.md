# PayOS Test Interface - Hướng dẫn sử dụng

## Tổng quan
Giao diện test PayOS được tạo để dễ dàng test tích hợp PayOS mà không cần frontend phức tạp. Giao diện này tương tự như `payos-demo-nodejs-main` nhưng được tích hợp vào project chính.

## Cách sử dụng

### 1. Khởi động server
```bash
npm start
```

### 2. Truy cập giao diện test
Mở trình duyệt và truy cập: `http://localhost:5001`

### 3. Các tính năng

#### 🛒 **Chọn sản phẩm test**
- **Gói Du lịch Cơ bản**: 100,000 VNĐ
- **Gói Du lịch Premium**: 500,000 VNĐ  
- **Gói Du lịch VIP**: 1,000,000 VNĐ

#### 💳 **Thông tin thanh toán**
- Tên khách hàng
- Email
- Số điện thoại
- Ghi chú thêm

#### 🔄 **Luồng thanh toán**
1. Chọn sản phẩm → 2. Nhập thông tin → 3. Tạo link thanh toán → 4. Chuyển đến PayOS → 5. Thanh toán → 6. Quay về kết quả

## API Endpoints

### Kiểm tra trạng thái PayOS
```
GET /api/payments/status
```

### Tạo link thanh toán test
```
POST /api/payments/create
Content-Type: application/json

{
  "amount": 100000,
  "description": "Test payment",
  "items": [
    {
      "name": "Test Product",
      "quantity": 1,
      "price": 100000
    }
  ],
  "customer": {
    "name": "Test User",
    "email": "test@example.com",
    "phone": "0123456789"
  }
}
```

### Xử lý return URL
```
GET /api/payments/return?orderCode=123456&status=success
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

## Cấu trúc file

```
public/
├── index.html          # Giao diện chính
├── success.html         # Trang thanh toán thành công
├── cancel.html          # Trang hủy thanh toán
├── style.css           # CSS styling
└── script.js           # JavaScript logic

src/
├── controllers/
│   └── payosTestController.js  # Controller xử lý PayOS test
├── routes/
│   └── payosTestRoutes.js      # Routes cho PayOS test
└── services/
    └── payos-service.js        # PayOS service
```

## Tính năng nổi bật

### 🎨 **Giao diện đẹp**
- Responsive design
- Modern UI với gradient background
- Font Awesome icons
- Smooth animations

### 🔧 **Dễ sử dụng**
- Chọn sản phẩm trực quan
- Form validation
- Loading states
- Error handling

### 📱 **Responsive**
- Hoạt động tốt trên mobile
- Tablet-friendly
- Desktop optimized

### 🚀 **Tích hợp hoàn chỉnh**
- Kết nối với PayOS service
- Database integration
- Webhook handling
- Return URL processing

### 💳 **PayOS Embedded Checkout**
- **Embedded Interface**: Thanh toán trực tiếp trên trang web
- **PayOS Checkout Script**: Sử dụng PayOS JavaScript SDK
- **Real-time Events**: onSuccess, onCancel, onExit callbacks
- **No Redirect**: Không cần chuyển trang để thanh toán
- **Mobile Optimized**: Responsive embedded iframe
- **Event Handling**: Xử lý tất cả trạng thái thanh toán

## Troubleshooting

### Lỗi "PayOS not configured"
1. Kiểm tra file `.env` có tồn tại không
2. Kiểm tra các biến môi trường PayOS
3. Restart server

### Lỗi "Cannot connect to server"
1. Kiểm tra server có đang chạy không
2. Kiểm tra port 5001 có bị chiếm không
3. Kiểm tra firewall

### Lỗi "Database connection failed"
1. Kiểm tra MongoDB có chạy không
2. Kiểm tra MONGODB_URI trong .env
3. Kiểm tra network connection

## Demo Flow

### 🔄 **Embedded Checkout Flow (Mới)**
1. **Truy cập**: `http://localhost:5001`
2. **Chọn sản phẩm**: Click vào một trong 3 gói du lịch
3. **Nhập thông tin**: Điền form thông tin khách hàng
4. **Tạo thanh toán**: Click "Tạo link thanh toán"
5. **Embedded PayOS**: PayOS checkout hiển thị ngay trên trang
6. **Thanh toán**: Sử dụng VietQR trong embedded iframe
7. **Kết quả**: Tự động chuyển đến trang success/cancel

### 🔄 **Traditional Redirect Flow**
1. **Truy cập**: `http://localhost:5001`
2. **Chọn sản phẩm**: Click vào một trong 3 gói du lịch
3. **Nhập thông tin**: Điền form thông tin khách hàng
4. **Tạo thanh toán**: Click "Tạo link thanh toán"
5. **Chuyển đến PayOS**: Tự động redirect đến trang PayOS
6. **Thanh toán**: Sử dụng VietQR để thanh toán
7. **Kết quả**: Quay về trang success/cancel

## PayOS Embedded Checkout

### 🎯 **Tính năng Embedded**
- **No Redirect**: Thanh toán ngay trên trang web
- **Real-time Events**: Xử lý sự kiện thanh toán real-time
- **Mobile Friendly**: Responsive embedded iframe
- **Event Callbacks**: onSuccess, onCancel, onExit

### 🔧 **Cấu hình PayOS**
```javascript
const payOSConfig = {
    RETURN_URL: window.location.origin + '/success.html',
    ELEMENT_ID: 'payos-checkout-container',
    CHECKOUT_URL: checkoutUrl,
    embedded: true,
    onSuccess: (event) => {
        // Xử lý thanh toán thành công
    },
    onCancel: (event) => {
        // Xử lý hủy thanh toán
    },
    onExit: (event) => {
        // Xử lý thoát khỏi checkout
    }
};
```

### 📱 **Responsive Design**
- Desktop: 500px height iframe
- Mobile: 400px height iframe
- Tablet: Adaptive height
- Touch-friendly interface

## Lưu ý

- Giao diện này chỉ dành cho testing
- Không sử dụng trong production
- Cần cấu hình PayOS credentials
- Cần MongoDB để lưu payment records

## So sánh với payos-demo-nodejs-main

| Tính năng | payos-demo-nodejs-main | PayOS Test Interface |
|-----------|------------------------|----------------------|
| Giao diện | Cơ bản | Modern, responsive |
| Tích hợp | Standalone | Integrated với project |
| Database | Không | Có MongoDB |
| API | Limited | Full API endpoints |
| Error handling | Cơ bản | Comprehensive |
| Mobile support | Không | Có |
