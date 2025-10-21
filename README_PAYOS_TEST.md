# 🚀 PayOS Test Interface - Quick Start

## Cách sử dụng nhanh

### 1. Cấu hình PayOS
Tạo file `.env` với nội dung:
```env
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key  
PAYOS_CHECKSUM_KEY=your_checksum_key
MONGODB_URI=mongodb://localhost:27017/veena-travel
```

### 2. Chạy server
```bash
npm start
```

### 3. Truy cập giao diện test
Mở trình duyệt: `http://localhost:5001`

### 4. Test thanh toán
1. Chọn sản phẩm (100k, 500k, hoặc 1M VNĐ)
2. Nhập thông tin khách hàng
3. Click "Tạo link thanh toán"
4. Chuyển đến PayOS để thanh toán
5. Quay về trang kết quả

## 📁 Files đã tạo

```
public/
├── index.html          # Giao diện chính
├── success.html         # Trang thành công
├── cancel.html          # Trang hủy
├── style.css           # CSS styling
└── script.js           # JavaScript

src/
├── controllers/payosTestController.js  # Controller
├── routes/payosTestRoutes.js           # Routes
└── services/payos-service.js          # PayOS service
```

## 🔧 API Endpoints

- `GET /` - Giao diện test
- `GET /api/payments/status` - Kiểm tra PayOS
- `POST /api/payments/create` - Tạo thanh toán
- `GET /api/payments/return` - Xử lý return URL
- `POST /api/payments/webhook` - Xử lý webhook

## 🎯 Tính năng

- ✅ Giao diện đẹp, responsive
- ✅ Chọn sản phẩm trực quan  
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Tích hợp PayOS hoàn chỉnh
- ✅ Database integration
- ✅ Webhook processing
- ✅ **PayOS Embedded Checkout** (Mới!)
- ✅ **No Redirect Payment** (Mới!)
- ✅ **Real-time Events** (Mới!)

## 📖 Documentation

- `PAYOS_SETUP.md` - Hướng dẫn setup PayOS
- `PAYOS_TEST_INTERFACE.md` - Chi tiết giao diện test
- `claude.md` - Context của project

## 🚨 Lưu ý

- Chỉ dành cho testing
- Cần PayOS credentials
- Cần MongoDB
- Không dùng trong production
