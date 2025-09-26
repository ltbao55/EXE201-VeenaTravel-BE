# Tổng Quan Dự Án Veena Travel Backend

## 📋 Thông Tin Dự Án
- **Tên dự án**: Veena Travel Backend
- **Công nghệ chính**: Node.js, Express.js, MongoDB (Mongoose)
- **Trạng thái**: Authentication đã được loại bỏ hoàn toàn
- **Cấu trúc**: RESTful API

## 🏗️ Cấu Trúc Thư Mục
```
src/
├── config/
│   └── db.js                 # Kết nối MongoDB
├── controllers/
│   ├── chatSessionsControllers.js
│   ├── destinationsControllers.js
│   ├── itinerariesControllers.js
│   ├── placesController.js
│   ├── plansController.js
│   ├── reviewsControllers.js
│   ├── tripsControllers.js
│   ├── userSubscriptionsController.js
│   └── usersControllers.js
├── models/
│   ├── ChatSession.js
│   ├── Destination.js
│   ├── Itinerary.js
│   ├── Payment.js
│   ├── Place.js
│   ├── Plan.js
│   ├── Review.js
│   ├── Trip.js
│   ├── User.js
│   └── UserSubscription.js
├── routes/
│   ├── chatSessionsRouters.js
│   ├── destinationsRouters.js
│   ├── itinerariesRouters.js
│   ├── placesRoutes.js
│   ├── plansRoutes.js
│   ├── reviewsRouters.js
│   ├── tripsRouters.js
│   ├── userSubscriptionsRoutes.js
│   └── usersRouters.js
├── services/
│   └── geocoding.js
└── server.js                 # Entry point
```

## 🔧 Thay Đổi Gần Đây - Loại Bỏ Authentication

### ✅ Đã Hoàn Thành:
1. **Xóa Authentication Middleware**:
   - Đã xóa `src/middleware/auth.js`
   - Loại bỏ `verifyFirebaseToken`, `requireAdmin`, `optionalAuth`

2. **Cập Nhật Routes**:
   - Tất cả routes giờ đây là **PUBLIC**
   - Không cần Bearer token
   - Admin routes giờ có thể truy cập công khai

3. **Cập Nhật Controllers**:
   - `placesController.js`: `addedBy` = `null`
   - `userSubscriptionsController.js`: Yêu cầu `userId` từ query parameter

4. **Cập Nhật Models**:
   - `User.js`: Loại bỏ `firebaseUid` field và index

5. **Dependencies**:
   - Đã xóa `firebase-admin` khỏi `package.json`

## 🌐 API Endpoints

### Public Routes (Không cần authentication)
```
GET    /api/health              # Health check
GET    /api/docs               # API documentation

# Users
GET    /api/users              # Lấy tất cả users
GET    /api/users/:id          # Lấy user theo ID
POST   /api/users              # Tạo user mới
PUT    /api/users/:id          # Cập nhật user
DELETE /api/users/:id          # Xóa user

# Trips
GET    /api/trips              # Lấy tất cả trips
POST   /api/trips              # Tạo trip mới
PUT    /api/trips/:id          # Cập nhật trip
DELETE /api/trips/:id          # Xóa trip

# Plans
GET    /api/plans              # Lấy tất cả plans
GET    /api/plans/:id          # Lấy plan theo ID
POST   /api/plans              # Tạo plan mới
PUT    /api/plans/:id          # Cập nhật plan
DELETE /api/plans/:id          # Xóa plan

# Places
GET    /api/places             # Lấy tất cả places
GET    /api/places/:id         # Lấy place theo ID
GET    /api/places/search/location  # Tìm kiếm theo location
POST   /api/places             # Tạo place mới
PUT    /api/places/:id         # Cập nhật place
DELETE /api/places/:id         # Xóa place
POST   /api/places/batch-geocode    # Batch geocoding

# Subscriptions (Yêu cầu userId parameter)
GET    /api/subscriptions/current?userId=123
GET    /api/subscriptions/history?userId=123
GET    /api/subscriptions/check-trip-limit?userId=123
GET    /api/subscriptions/check-message-limit?userId=123
GET    /api/subscriptions/admin/all
PUT    /api/subscriptions/admin/:id

# Chat Sessions
GET    /api/chat-sessions      # Lấy tất cả chat sessions
POST   /api/chat-sessions      # Tạo chat session mới
```

## 📊 Database Models (Mongoose)

### User Model
```javascript
{
  email: String (required, unique),
  name: String,
  avatar: String,
  role: String (enum: ['user', 'admin'], default: 'user'),
  lastLogin: Date,
  favoriteDestinations: [ObjectId],
  travelPreferences: Object
}
```

### Trip Model
```javascript
{
  userId: ObjectId,
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  destinations: [ObjectId],
  status: String,
  budget: Number
}
```

### Place Model
```javascript
{
  name: String,
  description: String,
  location: {
    type: String,
    coordinates: [Number]
  },
  address: String,
  category: String,
  tags: [String],
  images: [String],
  addedBy: ObjectId (now null)
}
```

## 🚀 Cách Chạy Dự Án

1. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

2. **Cấu hình môi trường**:
   - Tạo file `.env`
   - Thêm `MONGO_URI` cho MongoDB connection

3. **Chạy development server**:
   ```bash
   npm run dev
   ```

4. **Kiểm tra health**:
   ```
   GET http://localhost:5001/api/health
   ```

## ⚠️ Lưu Ý Quan Trọng

1. **Subscription Endpoints**: Cần truyền `userId` như query parameter
2. **Security**: Tất cả endpoints giờ đây là public - cân nhắc thêm rate limiting
3. **Data Validation**: Cần validate input data cẩn thận hơn khi không có auth
4. **User Management**: Cần cơ chế khác để quản lý users thay vì Firebase

## 🔄 Migration Notes

Nếu cần khôi phục authentication:
1. Reinstall `firebase-admin`
2. Tạo lại `src/middleware/auth.js`
3. Thêm lại auth middleware vào routes
4. Cập nhật User model với `firebaseUid`
5. Sửa controllers để sử dụng `req.user` thay vì parameters

## 📝 TODO

- [ ] Thêm input validation middleware
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Consider adding API key authentication
- [ ] Update API documentation
