# 📋 VEENA TRAVEL BACKEND - COMPREHENSIVE PROJECT INDEX

## 🏗️ PROJECT OVERVIEW

**Project Name:** VeenaTravel Backend (EXE201-VeenaTravel-BE)  
**Version:** 1.0.0  
**Type:** Node.js Express REST API with AI Integration  
**Database:** MongoDB with Mongoose ODM  
**Architecture:** Monolithic API serving React/Next.js Frontend  
**Current Status:** ✅ Development - Core functionality implemented  

---

## 📦 TECHNOLOGY STACK

### Core Framework
- **Node.js** with ES Modules
- **Express.js** (v5.1.0) - Web framework
- **Mongoose** (v8.18.1) - MongoDB ODM
- **Dotenv** (v17.2.2) - Environment configuration

### AI & Vector Database
- **Pinecone** (v6.1.2) - Vector database for semantic search
- **OpenRouter API** - AI chat functionality
- **Google Embedding API** - Text embeddings

### External Services
- **Mapbox** - Maps and directions
- **VNPAY** - Payment processing (configured)
- **Firebase** - Authentication (configured but not active)
- **Google Maps** - Geocoding services

### Development Tools
- **Nodemon** (v3.1.10) - Development server
- **UUID** (v13.0.0) - Unique identifiers
- **Axios** (v1.12.2) - HTTP client
- **Compression** (v1.8.1) - Response compression
- **CORS** (v2.8.5) - Cross-origin requests
- **Helmet** (v8.1.0) - Security headers
- **Express Rate Limit** (v8.1.0) - Rate limiting
- **Morgan** (v1.10.1) - HTTP logging

---

## 🏛️ PROJECT ARCHITECTURE

### Directory Structure
```
src/
├── config/
│   └── db.js                           # MongoDB connection
├── controllers/                        # Business logic
│   ├── chatSessionsControllers.js      # AI chat management
│   ├── destinationsControllers.js      # Destination CRUD
│   ├── itinerariesControllers.js       # Daily itinerary management
│   ├── placesController.js             # Places CRUD with geocoding
│   ├── plansController.js              # Subscription plans
│   ├── reviewsControllers.js           # Review system
│   ├── tripsControllers.js             # Trip management
│   ├── userSubscriptionsController.js  # Subscription management
│   └── usersControllers.js             # User management
├── models/                             # MongoDB schemas (10 models)
│   ├── ChatSession.js                  # AI chat sessions
│   ├── Destination.js                  # Travel destinations
│   ├── Itinerary.js                    # Detailed daily plans
│   ├── Payment.js                      # VNPAY payments
│   ├── Place.js                        # Points of interest
│   ├── Plan.js                         # Subscription plans
│   ├── Review.js                       # User reviews
│   ├── Trip.js                         # User trips
│   ├── User.js                         # User accounts
│   └── UserSubscription.js             # Active subscriptions
├── routes/                             # API endpoints
│   ├── chatSessionsRouters.js
│   ├── destinationsRouters.js
│   ├── itinerariesRouters.js
│   ├── placesRoutes.js
│   ├── plansRoutes.js
│   ├── reviewsRouters.js
│   ├── tripsRouters.js
│   ├── userSubscriptionsRoutes.js
│   └── usersRouters.js
├── services/                           # External integrations
│   ├── directionsService.js            # Route calculations
│   ├── embeddingService.js             # Text embeddings
│   ├── geocoding.js                    # Address to coordinates
│   ├── mapboxService.js                # Mapbox integration
│   ├── openRouterService.js            # AI chat service
│   └── pineconeService.js              # Vector search
└── server.js                           # Application entry point
```

---

## 🗄️ DATABASE MODELS (10 Models)

### Core User System
1. **User** - Basic user accounts (email, name, role)
2. **UserSubscription** - Active subscription tracking
3. **Plan** - Subscription plans (free/premium/pro)
4. **Payment** - VNPAY payment records

### Travel System
5. **Trip** - User travel plans with AI-generated itineraries
6. **Destination** - Comprehensive destination database
7. **Place** - Points of interest with geocoding
8. **Itinerary** - Detailed daily activity plans
9. **Review** - User reviews and ratings
10. **ChatSession** - AI chat conversations

### Key Model Features
- **Geospatial Indexing** - 2dsphere indexes for location queries
- **Text Search** - Full-text search on names and descriptions
- **Relationship Mapping** - Comprehensive ObjectId references
- **Pre-save Middleware** - Automatic calculations and validations
- **Soft Delete Patterns** - isActive flags for data preservation

---

## 🔗 API ENDPOINTS SUMMARY

### Public Endpoints (No Authentication)
- **Health & Docs:** `/api/health`, `/api/docs`
- **Plans:** GET `/api/plans`, `/api/plans/:id`
- **Places:** GET `/api/places`, `/api/places/search/location`

### Protected Endpoints (All Currently Public)
- **Users:** Full CRUD + preferences, favorites, trips
- **Trips:** CRUD + destinations management
- **Chat Sessions:** Session management + messaging
- **Subscriptions:** Usage tracking + limits checking
- **Admin Functions:** Plans/Places management

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables

---

## 🚀 AI & ADVANCED FEATURES

### Vector Search (Pinecone)
- Semantic similarity search for places
- Tag-based recommendations
- Similar places discovery
- Destination filtering

### AI Chat System
- OpenRouter integration for conversations
- Session management with context
- Message counting for subscription limits
- Trip generation from chat

### Geospatial Features
- MongoDB 2dsphere indexing
- Nearby destination queries
- Geocoding integration
- Distance calculations

### Payment System
- VNPAY integration ready
- Transaction tracking
- Refund management
- Multiple payment methods support

---

## 📊 CURRENT DEVELOPMENT STATUS

### ✅ Completed Features
- Complete database schema (10 models)
- Full CRUD operations for all entities
- AI chat session management
- Vector search integration
- Geospatial queries
- Payment system structure
- Rate limiting and security
- Comprehensive API documentation

### 🔄 In Development
- Reviews controller implementation
- Itineraries controller implementation
- AI trip generation workflow

### ❌ Planned Features
- Firebase authentication integration
- Real-time chat functionality
- Advanced AI recommendations
- Mobile app API optimization

---

## ⚙️ CONFIGURATION & DEPLOYMENT

### Environment Variables (53 total)
- **Server:** PORT, NODE_ENV
- **Database:** MONGODB_CONNECTIONSTRING
- **AI Services:** PINECONE_API_KEY, OPENROUTER_API_KEY, EMBEDDING_API_KEY
- **Maps:** MAPBOX_SECRET_TOKEN, GOOGLE_MAPS_API_KEY
- **Payment:** VNPAY_* configuration
- **Security:** JWT_SECRET, rate limiting
- **Email:** SMTP configuration

### Development Commands
```bash
npm install          # Install dependencies
npm run dev         # Development server (nodemon)
npm start           # Production server
```

### Health Check
- Endpoint: `GET /api/health`
- Port: 5001 (configurable)

---

## 🎯 ARCHITECTURE STRENGTHS

1. **Scalable Design** - Clean MVC separation
2. **Comprehensive Models** - Rich data relationships
3. **AI Integration** - Modern vector search capabilities
4. **Geospatial Support** - Advanced location features
5. **Payment Ready** - Complete VNPAY integration
6. **Security Focused** - Rate limiting, CORS, Helmet
7. **Developer Friendly** - Excellent documentation

---

## 📈 NEXT DEVELOPMENT PRIORITIES

### High Priority
1. Complete Reviews & Itineraries controllers
2. Implement AI trip generation workflow
3. Add authentication middleware
4. Enhanced input validation

### Medium Priority
1. Real-time features (WebSocket)
2. Advanced caching layer
3. API documentation (Swagger)
4. Monitoring and logging

### Low Priority
1. Performance optimization
2. Advanced analytics
3. Mobile-specific endpoints
4. Internationalization

---

*Project Index generated on: 2025-09-25*  
*Total Models: 10 | Total Services: 6 | Total Controllers: 9*
