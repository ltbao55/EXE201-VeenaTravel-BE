# Claude Memory Context - EXE201 Backend

## Project Overview
- **Project Name**: EXE201-BE (Backend for EXE201)
- **Type**: Node.js Backend API (ES Modules)
- **Main Purpose**: Travel/exploration API with hybrid search capabilities
- **Port**: 5001 (default)
- **Environment**: Development/Production

## Current Status
- Working on git rebase with 2 remaining commands
- Currently editing commit while rebasing
- Recent changes: Enhanced Explore API with multi-source aggregation and hybrid search
- Payment integration: Switched from PayOS to VNPay
- Authentication: Currently bypassed (all routes are public for testing)

## Key Features
- **Hybrid Search System**: Pinecone + Google Maps + MongoDB
- **Google Maps Integration**: Places search, geocoding, nearby search
- **AI Integration**: Gemini AI for chat and itinerary generation
- **Payment Processing**: PayOS integration (reversed from VNPay)
- **User Management**: Firebase + Email/Password authentication
- **Trip Planning**: AI-generated itineraries with geocoded locations
- **Partner Places**: Priority placement system for business partners
- **Admin Functionality**: Partner place management
- **Caching**: Redis-based caching for performance
- **Rate Limiting**: Express rate limiting for API protection

## Database Models
- **User**: Firebase + email auth, roles (user/admin)
- **Trip**: AI-generated itineraries with geocoded locations
- **Place**: Curated places with coordinates, ratings, categories
- **PartnerPlace**: Business partner locations with priority
- **Payment**: PayOS payment processing
- **ChatSession**: AI chat conversations
- **Review**: User reviews and ratings
- **Plan**: Travel plans
- **Destination**: Travel destinations
- **Itinerary**: Detailed trip itineraries
- **UserSubscription**: User subscription management

## API Endpoints Structure
- `/api/auth` - Authentication (Firebase + Email/Password)
- `/api/explore` - Enhanced explore with multi-source aggregation
- `/api/hybrid-search` - Hybrid search system
- `/api/maps` - Google Maps integration
- `/api/chat` - AI chat functionality
- `/api/itinerary` - AI-generated itineraries
- `/api/payments` - PayOS payment processing
- `/api/admin` - Admin functionality
- `/api/trips` - Trip management
- `/api/users` - User management
- `/api/places` - Places management

## Services Architecture
- **hybrid-search-service.js**: Orchestrates Pinecone + Google Maps search
- **googlemaps-service.js**: Google Maps API integration
- **pinecone-service.js**: Vector database for semantic search
- **gemini-service.js**: AI chat and content generation
- **cache-service.js**: Redis caching
- **logging-service.js**: System logging
- **payos-service.js**: PayOS integration (legacy)
- **partner-places-service.js**: Partner place management

## Recent Changes
- Enhanced Explore API with multi-source aggregation and hybrid search
- Fixed import authenticateToken in paymentRoutes
- **REVERSED: Switched back from VNPay to PayOS**
  - Removed VNPay service and documentation
  - Removed VNPay controller and routes
  - Restored PayOS-only payment processing
  - Updated Payment model to PayOS fields only
  - Payment controller and routes use PayOS exclusively
  - **FIXED: Removed all VNPay imports and references from server.js**
- **FIXED: PayOS Integration Issues**
  - Fixed PayOS service initialization with better error handling
  - Added missing verifyWebhookSignature method
  - Created comprehensive error messages for missing credentials
  - Added test scripts for PayOS integration
  - Created PAYOS_SETUP.md with detailed setup instructions
  - **ISSUE**: PayOS service requires .env file with PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY
- **CREATED: PayOS Test Interface**
  - Modern web interface for testing PayOS integration
  - Responsive design with product selection
  - Complete payment flow (create → pay → return)
  - Integrated with existing PayOS service and database
  - Static files served from /public directory
  - Routes: /api/payments/* for test interface
  - Files: public/index.html, success.html, cancel.html, style.css, script.js
  - Controller: payosTestController.js for test logic
  - Documentation: PAYOS_TEST_INTERFACE.md
- **ENHANCED: PayOS Embedded Checkout**
  - PayOS Checkout Script integration (https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js)
  - Embedded iframe checkout (no redirect required)
  - Real-time event handling (onSuccess, onCancel, onExit)
  - Mobile-optimized responsive design
  - Event callbacks for payment status
  - CSS styling for embedded interface
  - JavaScript integration with PayOS SDK
- Authentication currently bypassed for testing

## Dependencies
- **Core**: Express.js, MongoDB/Mongoose
- **AI**: @google/generative-ai, Pinecone
- **Maps**: Google Maps API
- **Payment**: PayOS integration
- **Security**: Helmet, CORS, Rate limiting
- **Utilities**: Axios, bcryptjs, compression, morgan

## File Structure
- **Controllers**: Business logic for different modules
- **Models**: MongoDB schemas with Mongoose
- **Routes**: API endpoint definitions
- **Services**: External service integrations
- **Scripts**: Utility and test scripts
- **Middleware**: Authentication and security
- **Config**: Database and environment configuration
