# VeenaTravel Backend - Codebase Index

## 📋 Project Overview

**VeenaTravel Backend** is a Node.js/Express REST API for a travel planning application with AI-powered features, payment integration, and comprehensive search capabilities.

- **Main Entry Point**: `src/server.js`
- **Port**: 5001 (default)
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: PayOS integration
- **AI Services**: Google Gemini AI, Pinecone Vector Database
- **Maps**: Google Maps API

---

## 📁 Directory Structure

### Root Files
```
EXE201-VeenaTravel-BE/
├── package.json              # Dependencies and scripts
├── package-lock.json         # Locked dependency versions
├── claude.md                 # Project context/documentation
├── docs-server.js            # Documentation server (if exists)
├── vt_data_chuan.json        # Data file
└── README_PAYOS_TEST.md      # PayOS testing guide
```

### Documentation Files
- `EXPLORE_DIVERSE_CATEGORIES_GUIDE.md` - Guide for explore feature categories
- `PAYOS_SETUP.md` - PayOS integration setup instructions
- `PAYOS_TEST_INTERFACE.md` - PayOS test interface documentation
- `postman_collection_explore_api.json` - Postman collection for API testing

---

## 🗂️ Source Code Structure (`src/`)

### Core Application Files

#### `server.js`
Main Express application server
- Express app configuration
- Middleware setup (CORS, Helmet, Rate Limiting, Compression, Morgan)
- Route registration
- Error handling
- Graceful shutdown handling
- Health check endpoint (`/api/health`)
- API documentation endpoint (`/api/docs`)

---

### 📂 Configuration (`config/`)

#### `db.js`
- MongoDB connection setup
- Database connection management

---

### 🎮 Controllers (`controllers/`)

Business logic handlers for each feature:

#### Authentication & Users
- **`authController.js`** - User registration, login, JWT verification, password management
- **`usersControllers.js`** - User profile management, user CRUD operations

#### Travel Planning
- **`tripsControllers.js`** - Trip creation, management, CRUD operations
- **`itinerariesControllers.js`** - Itinerary management
- **`itineraryController.js`** - AI-powered itinerary generation
- **`plansController.js`** - Travel plans management
- **`destinationsControllers.js`** - Destination management

#### Places & Locations
- **`placesController.js`** - Places search, CRUD operations
- **`mapsController.js`** - Google Maps integration (geocoding, nearby search, directions)
- **`reviewsControllers.js`** - Reviews management

#### Search & Discovery
- **`searchController.js`** - Universal search functionality
- **`hybridSearchController.js`** - Hybrid search (semantic + keyword)
- **`exploreController.js`** - Explore places and destinations by categories

#### AI & Chat
- **`chatController.js`** - AI chat assistant for travel planning
- **`chatSessionsControllers.js`** - Chat session management

#### Payments & Subscriptions
- **`paymentController.js`** - PayOS payment processing
- **`payosTestController.js`** - PayOS testing interface
- **`userSubscriptionsController.js`** - Subscription management (Free, Premium, Pro)

#### Admin
- **`adminController.js`** - Administrative functions, partner places management

---

### 🛡️ Middleware (`middleware/`)

#### `auth.js`
- JWT authentication middleware
- Token verification
- User authorization
- `bypassAuth` - Optional authentication bypass for development

#### `subscription.js`
- Subscription validation
- Feature access control based on subscription tier
- Usage limit checking (trips, messages)

---

### 📊 Models (`models/`)

Mongoose schemas for database entities:

- **`User.js`** - User model (email, password, profile, subscription)
- **`Trip.js`** - Trip model (user trips, destinations, dates)
- **`Itinerary.js`** - Itinerary model (trip plans, activities, schedule)
- **`Plan.js`** - Travel plan model
- **`Place.js`** - Place model (locations, attractions, POIs)
- **`PartnerPlace.js`** - Partner/featured places model
- **`Destination.js`** - Destination model
- **`Review.js`** - Review model (user reviews for places/trips)
- **`ChatSession.js`** - Chat session model (AI chat history)
- **`Payment.js`** - Payment transaction model (PayOS)
- **`UserSubscription.js`** - User subscription model (tier, expiry, limits)

---

### 🛣️ Routes (`routes/`)

API route definitions:

#### Authentication & Users
- **`authRoutes.js`** - `/api/auth/*` - Registration, login, verification
- **`usersRouters.js`** - `/api/users/*` - User profile endpoints

#### Travel Planning
- **`tripsRouters.js`** - `/api/trips/*` - Trip management
- **`itinerariesRouters.js`** - `/api/itineraries/*` - Itinerary endpoints
- **`itineraryRoutes.js`** - `/api/itinerary/*` - AI itinerary generation
- **`plansRoutes.js`** - `/api/plans/*` - Travel plans
- **`destinationsRouters.js`** - `/api/destinations/*` - Destinations

#### Places & Locations
- **`placesRoutes.js`** - `/api/places/*` - Places search and management
- **`mapsRoutes.js`** - `/api/maps/*` - Google Maps endpoints
- **`test-maps.js`** - `/api/test-maps/*` - Maps testing routes
- **`reviewsRouters.js`** - `/api/reviews/*` - Reviews endpoints

#### Search & Discovery
- **`searchRoutes.js`** - `/api/search/*` - Universal search
- **`hybridSearchRoutes.js`** - `/api/hybrid-search/*` - Hybrid search
- **`exploreRoutes.js`** - `/api/explore/*` - Explore feature
- **`integrated-search.js`** - `/api/integrated-search/*` - Integrated search

#### AI & Chat
- **`chatRoutes.js`** - `/api/chat/*` - AI chat endpoints
- **`chatSessionsRouters.js`** - `/api/chat-sessions/*` - Chat sessions

#### Payments & Subscriptions
- **`paymentRoutes.js`** - `/api/payments/*` - Payment processing
- **`userSubscriptionsRoutes.js`** - `/api/subscriptions/*` - Subscriptions

#### Admin
- **`adminRoutes.js`** - `/api/admin/partner-places/*` - Admin endpoints

---

### 🔧 Services (`services/`)

Reusable service modules:

#### AI & Search Services
- **`gemini-service.js`** - Google Gemini AI integration
- **`pinecone-service.js`** - Pinecone vector database operations
- **`hybrid-search-service.js`** - Hybrid search implementation
- **`integrated-search-service.js`** - Integrated search service

#### External APIs
- **`googlemaps-service.js`** - Google Maps API wrapper
- **`googleMapsService.js`** - Alternative Google Maps service
- **`payos-service.js`** - PayOS payment gateway integration

#### Business Logic
- **`subscription-service.js`** - Subscription management logic
- **`partner-places-service.js`** - Partner places business logic
- **`cache-service.js`** - Caching utilities
- **`logging-service.js`** - Logging utilities

---

### 🛠️ Utilities (`utils/`)

Helper functions:

- **`coordinate-helpers.js`** - Geographic coordinate calculations and utilities

---

### 📜 Scripts (`scripts/`)

Utility and setup scripts:

#### Data Management
- **`importData.js`** - Import data into database
- **`seed-plans.js`** - Seed travel plans
- **`seed-explore-hcm.js`** - Seed Ho Chi Minh explore data
- **`add-diverse-places.js`** - Add diverse places to database
- **`add-partner-places.js`** - Add partner places

#### Vector Database
- **`createPineconeIndex.js`** - Create Pinecone index
- **`uploadToPineconeComplete.js`** - Upload data to Pinecone

#### Testing Scripts
- **`test-api-endpoints.js`** - Test API endpoints
- **`test-api-direct.js`** - Direct API testing
- **`test-api-docs.js`** - Test API documentation
- **`test-server-api.js`** - Server API testing
- **`test-real-api.js`** - Real API testing
- **`test-explore-api.js`** - Test explore endpoints
- **`test-explore-data.js`** - Test explore data
- **`test-explore-responses.js`** - Test explore responses
- **`test-explore-simple.js`** - Simple explore testing
- **`test-hybrid-search.js`** - Test hybrid search
- **`test-hybrid-search-improvements.js`** - Test hybrid search improvements
- **`test-google-maps.js`** - Test Google Maps integration
- **`test-geocoding-fix.js`** - Test geocoding fixes
- **`test-payos.js`** - Test PayOS integration
- **`test-payos-simple.js`** - Simple PayOS testing
- **`test-payment-with-auth.js`** - Test payment with authentication
- **`test-subscription-system.js`** - Test subscription system
- **`test-chat-limits.js`** - Test chat message limits
- **`test-diverse-categories.js`** - Test diverse categories
- **`test-diverse-categories-simple.js`** - Simple categories testing
- **`test-photos-response.js`** - Test photos response
- **`test-full-system.js`** - Full system integration test
- **`test-admin-partner-places.js`** - Test admin partner places

#### Demo Scripts
- **`demo-api-endpoints.js`** - Demo API endpoints
- **`demo-explore-data.js`** - Demo explore data
- **`demo-explore-system.js`** - Demo explore system
- **`demo-random-feature.js`** - Demo random features

#### Data Checking
- **`check-explore-data.js`** - Check explore data
- **`check-explore-data-real.js`** - Check real explore data

---

### 🌐 Public Files (`public/`)

Static files served by Express:

- **`api-docs.html`** - API documentation page
- **`success.html`** - Payment success page
- **`cancel.html`** - Payment cancellation page

---

## 🔌 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Users (`/api/users`)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/subscriptions` - Get user subscriptions

### Trips (`/api/trips`)
- `GET /api/trips` - Get user trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Itineraries (`/api/itinerary`)
- `POST /api/itinerary/generate` - Generate AI itinerary
- `GET /api/itinerary/:id` - Get itinerary details

### Plans (`/api/plans`)
- `GET /api/plans` - Get all travel plans
- `GET /api/plans/:id` - Get plan details
- `POST /api/plans` - Create new plan
- `PUT /api/plans/:id` - Update plan

### Places (`/api/places`)
- `GET /api/places` - Get places
- `GET /api/places/:id` - Get place details
- `GET /api/places/search` - Search places
- `POST /api/places` - Add new place

### Maps (`/api/maps`)
- `GET /api/maps/geocode` - Geocode address
- `GET /api/maps/nearby` - Find nearby places
- `POST /api/maps/directions` - Get directions

### Search (`/api/search`, `/api/hybrid-search`, `/api/explore`)
- `POST /api/search` - Universal search
- `POST /api/hybrid-search` - Hybrid search (semantic + keyword)
- `GET /api/explore` - Explore places and destinations
- `GET /api/explore/nearby` - Hybrid nearby search with radius filter
- `GET /api/explore/categories` - Get available categories with counts
- `GET /api/explore/featured` - Get featured/curated places
- `GET /api/explore/place/:placeId` - Get place details via Google Maps placeId
- `GET /api/explore/:id` - Get place details via internal ID

### Chat (`/api/chat`)
- `POST /api/chat/message` - Send message to AI chat
- `POST /api/chat/modify-itinerary` - Modify itinerary via chat
- `POST /api/chat/recommendations` - Get travel recommendations

### Chat Sessions (`/api/chat-sessions`)
- `GET /api/chat-sessions` - Get chat sessions
- `GET /api/chat-sessions/:id` - Get chat session details

### Subscriptions (`/api/subscriptions`)
- `GET /api/subscriptions/current` - Get current subscription
- `GET /api/subscriptions/history` - Get subscription history
- `GET /api/subscriptions/check-trip-limit` - Check trip limit
- `GET /api/subscriptions/check-message-limit` - Check message limit

### Payments (`/api/payments`)
- `POST /api/payments/create` - Create payment link
- `GET /api/payments/info/:orderCode` - Get payment info
- `GET /api/payments/user-payments` - Get user payments
- `POST /api/payments/cancel/:orderCode` - Cancel payment
- `GET /api/payments/return` - Payment return callback
- `POST /api/payments/webhook` - PayOS webhook handler

### Admin (`/api/admin/partner-places`)
- `GET /api/admin/partner-places` - Get partner places
- `POST /api/admin/partner-places` - Add partner place
- `PUT /api/admin/partner-places/:id` - Update partner place
- `DELETE /api/admin/partner-places/:id` - Delete partner place

### System
- `GET /api/health` - Health check
- `GET /api/docs` - API documentation

---

## 🔑 Key Features

### 1. Authentication & Authorization
- JWT-based authentication
- Password hashing with bcryptjs
- Protected routes with middleware
- User profile management

### 2. Subscription System
- Three tiers: Free, Premium, Pro
- Usage limits (trips, messages)
- Subscription validation middleware
- Payment integration for upgrades

### 3. AI-Powered Features
- Google Gemini AI integration
- AI chat assistant for travel planning
- AI-generated itineraries
- Semantic search with Pinecone

### 4. Search & Discovery
- Universal search
- Hybrid search (semantic + keyword)
- Explore feature with categories
- Google Maps integration

### 5. Payment Integration
- PayOS payment gateway
- Payment webhooks
- Transaction management
- Subscription upgrades

### 6. Travel Planning
- Trip management
- Itinerary generation
- Destination management
- Travel plans

---

## 📦 Dependencies

### Core
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `dotenv` - Environment variables

### Security
- `helmet` - Security headers
- `cors` - Cross-origin resource sharing
- `express-rate-limit` - Rate limiting

### External Services
- `@google/generative-ai` - Google Gemini AI
- `@pinecone-database/pinecone` - Pinecone vector database
- `@payos/node` - PayOS payment gateway
- `firebase-admin` - Firebase Admin SDK
- `axios` - HTTP client

### Utilities
- `compression` - Response compression
- `morgan` - HTTP request logger
- `uuid` - UUID generation
- `node-fetch` - Fetch API for Node.js

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB
- Environment variables configured (`.env`)

### Installation
```bash
npm install
```

### Environment Variables
Required `.env` variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `PORT` - Server port (default: 5001)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` or `FRONTEND_URLS` - Frontend URL(s) for CORS in production (comma-separated for multiple URLs)
- `PAYOS_CLIENT_ID` - PayOS client ID
- `PAYOS_API_KEY` - PayOS API key
- `PAYOS_CHECKSUM_KEY` - PayOS checksum key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `GEMINI_API_KEY` - Google Gemini API key
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_INDEX_NAME` - Pinecone index name

### Running the Server
```bash
# Development
npm run dev

# Production
npm start
```

### Scripts
```bash
npm run import-data        # Import data
npm run add-diverse-places # Add diverse places
```

---

## 📝 Notes

- The application uses ES6 modules (`"type": "module"` in package.json)
- Authentication can be bypassed in development using `bypassAuth` middleware
- Rate limiting is applied to all `/api/` routes
- CORS is configured for development and production environments
- Error handling includes global error middleware
- Graceful shutdown handling for production deployments

---

## 🔍 Quick Reference

### Find Files By Purpose
- **Authentication**: `controllers/authController.js`, `routes/authRoutes.js`, `middleware/auth.js`
- **Payments**: `controllers/paymentController.js`, `routes/paymentRoutes.js`, `services/payos-service.js`
- **AI Chat**: `controllers/chatController.js`, `routes/chatRoutes.js`, `services/gemini-service.js`
- **Search**: `controllers/hybridSearchController.js`, `services/hybrid-search-service.js`, `services/pinecone-service.js`
- **Maps**: `controllers/mapsController.js`, `routes/mapsRoutes.js`, `services/googlemaps-service.js`
- **Subscriptions**: `controllers/userSubscriptionsController.js`, `services/subscription-service.js`, `middleware/subscription.js`

---

*Last Updated: Generated automatically*
*For detailed API documentation, visit `/api/docs` endpoint*

