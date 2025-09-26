# 📋 VEENA TRAVEL BACKEND - PROJECT INDEX

## 🏗️ PROJECT OVERVIEW

**Project Name:** VeenaTravel Backend API  
**Version:** 1.0.0  
**Type:** Node.js Express REST API  
**Database:** MongoDB with Mongoose ODM  
**Authentication:** Firebase Authentication  
**Current Status:** ✅ Running on port 5000

---

## 📦 TECHNOLOGY STACK

### Core Dependencies
- **Express.js** (v5.1.0) - Web framework
- **Mongoose** (v8.18.1) - MongoDB ODM
- **Firebase Admin** (v13.5.0) - Authentication
- **Dotenv** (v17.2.2) - Environment variables

### Security & Performance
- **Helmet** (v8.1.0) - Security headers
- **CORS** (v2.8.5) - Cross-origin requests
- **Express Rate Limit** (v8.1.0) - Rate limiting
- **Compression** (v1.8.1) - Response compression

### Development Tools
- **Nodemon** (v3.1.10) - Development server
- **Morgan** (v1.10.1) - HTTP logging

---

## 🏛️ PROJECT ARCHITECTURE

### Directory Structure
```
src/
├── config/
│   └── db.js                    # MongoDB connection
├── controllers/                 # Business logic
│   ├── chatSessionsControllers.js
│   ├── placesController.js
│   ├── plansController.js
│   ├── tripsControllers.js
│   ├── usersControllers.js
│   └── userSubscriptionsController.js
├── middleware/
│   └── auth.js                  # Firebase authentication
├── models/                      # MongoDB schemas
│   ├── ChatSession.js
│   ├── Place.js
│   ├── Plan.js
│   ├── Trip.js
│   ├── User.js
│   └── UserSubscription.js
├── routes/                      # API endpoints
│   ├── chatSessionsRouters.js
│   ├── placesRoutes.js
│   ├── plansRoutes.js
│   ├── tripsRouters.js
│   ├── usersRouters.js
│   └── userSubscriptionsRoutes.js
├── services/
│   └── geocoding.js             # Google Maps integration
└── server.js                    # Main application entry
```

---

## 🗄️ DATABASE MODELS

### 👤 User Model
- **Firebase Integration:** firebaseUid, email
- **Profile:** name, avatar, role (user/admin)
- **Status:** isActive, lastLogin
- **Indexes:** firebaseUid, email, role

### 🧳 Trip Model
- **AI Integration:** itinerary (Gemini-generated JSON)
- **References:** userId, places[], chatSessionId
- **Metadata:** destination, interests, status
- **Features:** public sharing, rating, feedback

### 📋 Plan Model (Subscription Plans)
- **Pricing:** name, price, type (free/premium/pro)
- **Limits:** trip_limit, message_limit, duration
- **Features:** description, features[], displayOrder

### 📍 Place Model
- **Location:** name, address, coordinates (lat/lng)
- **Details:** description, tags, category, images
- **Business:** contact info, opening hours, price range
- **Reviews:** rating system, admin management

### 💬 ChatSession Model
- **Session:** sessionId, userId, messages[]
- **AI Integration:** role-based messages (user/assistant)
- **Tracking:** messageCount, lastActivity, generatedTrip
