# Hướng dẫn Test Authentication với Email/Password

## 🎯 Chức năng đã thêm:

### 1. **Đăng ký với Email/Password**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456",
  "name": "Test User"
}
```

**Response thành công:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "test@example.com",
      "name": "Test User",
      "role": "user",
      "authMethod": "email"
    },
    "token": "jwt_token_here"
  }
}
```

### 2. **Đăng nhập với Email/Password**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "123456"
}
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "test@example.com",
      "name": "Test User",
      "role": "user",
      "authMethod": "email"
    },
    "token": "jwt_token_here"
  }
}
```

### 3. **Lấy thông tin profile (JWT)**
```bash
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

### 4. **Đổi mật khẩu (JWT)**
```bash
PUT /api/auth/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "123456",
  "newPassword": "newpassword123"
}
```

## 🔐 Dual Authentication System:

Hệ thống hiện tại hỗ trợ **2 phương thức authentication**:

### **Firebase Authentication:**
- Sử dụng Firebase ID Token
- Header: `Authorization: Bearer <firebase_token>`
- Tự động tạo user trong database nếu chưa có

### **Email/Password Authentication:**
- Sử dụng JWT Token
- Header: `Authorization: Bearer <jwt_token>`
- Mật khẩu được hash với bcrypt

## 🧪 Test với curl:

### Đăng ký:
```bash
curl -X POST "http://localhost:5001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "name": "Test User"
  }'
```

### Đăng nhập:
```bash
curl -X POST "http://localhost:5001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### Test protected route với JWT:
```bash
curl -X GET "http://localhost:5001/api/auth/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Test protected route với Firebase token:
```bash
curl -X GET "http://localhost:5001/api/users" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE"
```

## 📋 Protected Routes:

Các routes sau yêu cầu authentication (hỗ trợ cả Firebase và JWT):
- `/api/trips/*` - Quản lý chuyến đi
- `/api/users/*` - Quản lý người dùng
- `/api/subscriptions/*` - Quản lý subscription
- `/api/chat-sessions/*` - Chat sessions

## 🔧 Environment Variables cần thiết:

Đảm bảo file `.env` có:
```env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
```

## 🚀 Cách sử dụng:

1. **Frontend có thể chọn 1 trong 2 phương thức:**
   - Đăng nhập bằng Firebase (Google, Facebook, etc.)
   - Đăng nhập bằng Email/Password

2. **Cả 2 phương thức đều có thể truy cập các protected routes**

3. **Token được trả về sau khi đăng nhập thành công**

4. **Sử dụng token trong header Authorization cho các API calls tiếp theo**
