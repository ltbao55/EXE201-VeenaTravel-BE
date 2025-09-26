# VeenaTravel Backend - Báo Cáo Index Dự Án

## 📋 Tổng Quan Dự Án

**Tên dự án:** VeenaTravel Backend (EXE201-BE)  
**Phiên bản:** 1.0.0  
**Loại:** Travel Planning & AI Chat Backend API  
**Công nghệ chính:** Node.js, Express.js, MongoDB, Firebase Authentication  

## 🏗️ Kiến Trúc Hệ Thống

### Cấu Trúc Thư Mục
```
VeenaTravel-BE/
├── src/
│   ├── config/          # Cấu hình database
│   ├── controllers/     # Business logic controllers
│   ├── middleware/      # Authentication & validation
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API route definitions
│   ├── services/       # External services (Geocoding)
│   └── server.js       # Main application entry
├── package.json        # Dependencies & scripts
└── README files        # Documentation
```

## 🔧 Công Nghệ & Dependencies

### Core Technologies
- **Runtime:** Node.js với ES Modules
- **Framework:** Express.js v5.1.0
- **Database:** MongoDB với Mongoose ODM v8.18.1
- **Authentication:** Firebase Admin SDK v13.5.0

### Key Dependencies
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variables management
- `axios`: HTTP client for external APIs
- `uuid`: Unique identifier generation
- `nodemon`: Development auto-reload

### Security & Performance
- Helmet.js for security headers
- Rate limiting middleware
- Request compression
- CORS configuration
- Input validation & sanitization

## 💾 Database Schema

### Core Models

#### 1. User Model
- **Firebase Integration:** `firebaseUid`, `email`, `name`
- **Role Management:** `role` (user/admin)
- **Activity Tracking:** `isActive`, `lastLogin`
- **Indexes:** firebaseUid, email, role

#### 2. Trip Model
- **AI Integration:** `itinerary` (JSON từ Gemini AI)
- **User Association:** `userId` reference
- **Places Reference:** Array of Place ObjectIds
- **Status Tracking:** active/completed/cancelled
- **Chat Integration:** `chatSessionId` reference

#### 3. Plan Model (Subscription Plans)
- **Pricing:** `price`, `trip_limit`, `message_limit`
- **Features:** `description`, `features` array
- **Types:** free/premium/pro
- **Status:** `isActive`, `displayOrder`

#### 4. Place Model
- **Location Data:** `address`, `location` (lat/lng)
- **Categorization:** `category`, `tags`
- **Rich Content:** `images`, `description`
- **Business Info:** `contact`, `openingHours`, `priceRange`
- **Text Search Index:** name, description, tags

#### 5. ChatSession Model
- **Session Management:** `sessionId`, `userId`
- **Message History:** Array of user/assistant messages
- **Activity Tracking:** `lastActivity`, `messageCount`
- **Trip Integration:** `generatedTrip` reference

#### 6. UserSubscription Model
- **Plan Association:** `userId`, `planId`
- **Usage Tracking:** `current_trip_count`, `current_message_count`
- **Billing:** `startDate`, `endDate`, `lastPaymentId`
- **Status Management:** active/expired/cancelled/pending

#### 7. Payment Model (VNPAY Integration)
- **Transaction Data:** `amount`, `currency`, `status`
- **VNPAY Fields:** `vnp_TxnRef`, `vnp_TransactionNo`, etc.
- **Payment Methods:** vnpay/momo/zalopay/bank_transfer
- **Refund Support:** refund amount, reason, transaction ID

#### 8. Destination & Review Models
- **Rich Location Data:** coordinates, region, category
- **Practical Info:** opening hours, entrance fees, facilities
- **User Generated Content:** ratings, reviews, images
- **Accessibility:** wheelchair access, family-friendly flags

#### 9. Itinerary Model
- **Daily Planning:** `dayNumber`, `date`, activities array
- **Activity Details:** destination, timing, cost, booking info
- **Transportation:** method, duration, cost between activities
- **AI Integration:** `isAiSuggested`, `aiConfidence`

## 🛣️ API Endpoints

### Authentication Required Routes
- **Trips:** `/api/trips` - CRUD operations for user trips
- **Users:** `/api/users` - User management & preferences
- **Subscriptions:** `/api/subscriptions` - Subscription management
- **Chat Sessions:** `/api/chat-sessions` - AI chat functionality

### Public Routes
- **Plans:** `/api/plans` - Browse subscription plans
- **Places:** `/api/places` - Browse travel destinations
- **Health Check:** `/api/health` - System status
- **API Docs:** `/api/docs` - Endpoint documentation

### Route Features
- **Pagination:** page, limit parameters
- **Filtering:** status, user, category filters
- **Population:** Mongoose populate for related data
- **Search:** Text search capabilities
- **Validation:** Input validation & error handling

## 🔐 Authentication & Authorization

### Firebase Integration
- **Token Verification:** Firebase ID token validation
- **User Auto-Creation:** Automatic user creation on first login
- **Profile Sync:** Name, email, avatar from Firebase
- **Default Subscription:** Free plan auto-assignment

### Authorization Levels
- **Public:** Plans, Places browsing
- **Authenticated:** Trip management, Chat sessions
- **Admin:** Plan management, User administration

### Middleware Stack
- **verifyFirebaseToken:** Standard authentication
- **requireAdmin:** Admin-only access
- **optionalAuth:** Optional authentication for public routes

## 🌐 External Services

### Google Geocoding Service
- **Address to Coordinates:** Full geocoding support
- **Reverse Geocoding:** Coordinates to address
- **Vietnam Optimization:** Vietnamese language & region bias
- **Batch Processing:** Multiple address geocoding
- **Rate Limiting:** Built-in API rate limit handling
- **Validation:** Vietnam bounds checking

## 🚀 Server Configuration

### Security Features
- **Helmet.js:** Security headers
- **Rate Limiting:** 100 requests/15min per IP
- **CORS:** Configurable origin whitelist
- **Input Validation:** JSON parsing with size limits
- **Error Handling:** Comprehensive error middleware

### Performance Optimizations
- **Compression:** Response compression middleware
- **Request Logging:** Morgan logging (dev/production modes)
- **Custom Metrics:** Request duration tracking
- **Database Indexing:** Optimized query performance

### Environment Support
- **Development:** Enhanced logging, relaxed security
- **Production:** Secure headers, compressed responses
- **Graceful Shutdown:** SIGTERM/SIGINT handling
- **Health Monitoring:** Built-in health check endpoint

## 📊 Key Features

### AI Travel Planning
- **Gemini AI Integration:** Intelligent itinerary generation
- **Chat-based Interface:** Natural language trip planning
- **Context Awareness:** Session-based conversation tracking
- **Trip Generation:** AI-powered travel recommendations

### Subscription Management
- **Flexible Plans:** Free, Premium, Pro tiers
- **Usage Tracking:** Trip and message limits
- **VNPAY Integration:** Vietnamese payment gateway
- **Auto-renewal:** Subscription lifecycle management

### Location Intelligence
- **Rich Place Data:** Comprehensive destination information
- **Geocoding Integration:** Accurate location services
- **Search & Discovery:** Text-based place search
- **User Favorites:** Personalized destination lists

### User Experience
- **Firebase Auth:** Seamless authentication
- **Profile Management:** User preferences & history
- **Trip Sharing:** Public/private trip visibility
- **Review System:** User-generated content

## 🔍 Database Indexes & Performance

### Optimized Queries
- **User Lookups:** firebaseUid, email indexes
- **Trip Filtering:** userId, status, createdAt indexes
- **Location Search:** 2dsphere index for coordinates
- **Text Search:** Full-text search on places
- **Chat Sessions:** sessionId, userId, lastActivity indexes

### Compound Indexes
- **User Subscriptions:** userId + status + endDate
- **Trip Management:** userId + status combinations
- **Performance Monitoring:** Optimized for common query patterns

## 📈 Scalability Considerations

### Database Design
- **Normalized Relations:** Proper referencing between collections
- **Flexible Schema:** JSON storage for AI-generated content
- **Index Strategy:** Performance-optimized query patterns

### API Design
- **RESTful Architecture:** Standard HTTP methods & status codes
- **Pagination:** Built-in pagination for large datasets
- **Error Handling:** Consistent error response format
- **Rate Limiting:** Protection against abuse

### Monitoring & Logging
- **Request Tracking:** Detailed request/response logging
- **Error Logging:** Comprehensive error capture
- **Performance Metrics:** Response time monitoring
- **Health Checks:** System status endpoints

## 🎯 Điểm Nổi Bật Của Dự Án

### Tính Năng Độc Đáo
- **AI-Powered Travel Planning:** Tích hợp Gemini AI để tạo lịch trình thông minh
- **Firebase Authentication:** Xác thực liền mạch với Google/Facebook
- **VNPAY Integration:** Thanh toán trực tuyến cho thị trường Việt Nam
- **Real-time Chat:** Hệ thống chat AI với context awareness
- **Geocoding Intelligence:** Tích hợp Google Maps cho dữ liệu địa điểm chính xác

### Kiến Trúc Hiện Đại
- **Microservices Ready:** Cấu trúc modular dễ mở rộng
- **RESTful API:** Thiết kế API chuẩn REST
- **Database Optimization:** Indexes và query optimization
- **Security First:** Comprehensive security middleware stack
- **Performance Focused:** Compression, caching, rate limiting

### Business Logic
- **Subscription Model:** Flexible pricing tiers (Free/Premium/Pro)
- **Usage Tracking:** Real-time monitoring của trip và message limits
- **Admin Dashboard:** Complete admin functionality
- **User Experience:** Intuitive API design for frontend integration

## 📋 API Endpoints Summary

### Core Endpoints
```
GET    /api/health              # System health check
GET    /api/docs               # API documentation
GET    /api/plans              # Browse subscription plans
GET    /api/places             # Browse destinations
POST   /api/users              # User registration/login
GET    /api/trips              # User's trips
POST   /api/chat-sessions      # Start AI chat
POST   /api/subscriptions      # Manage subscriptions
```

### Advanced Features
```
POST   /api/trips/:id/destinations     # Add destination to trip
DELETE /api/trips/:id/destinations/:id # Remove destination
PUT    /api/users/:id/preferences      # Update travel preferences
POST   /api/users/:id/favorites        # Add favorite destination
GET    /api/chat-sessions/user/:id     # User's chat history
```

## 🔧 Development & Deployment

### Environment Variables Required
```
MONGODB_CONNECTIONSTRING=mongodb://...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
GOOGLE_MAPS_API_KEY=your-maps-api-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Scripts Available
```bash
npm run dev     # Development with nodemon
npm start       # Production server
```

### Production Considerations
- **Environment:** NODE_ENV=production
- **Security:** All security headers enabled
- **Logging:** Structured logging for monitoring
- **Error Handling:** Comprehensive error responses
- **Rate Limiting:** Production-ready limits

---

**Ngày tạo báo cáo:** 2025-09-21
**Phiên bản API:** 1.0.0
**Trạng thái:** Production Ready
**Tác giả:** VeenaTravel Development Team
