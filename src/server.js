import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";

// Import routes
import tripRoute from "./routes/tripsRouters.js";
import userRoute from "./routes/usersRouters.js";
import plansRoute from "./routes/plansRoutes.js";
import placesRoute from "./routes/placesRoutes.js";
import userSubscriptionsRoute from "./routes/userSubscriptionsRoutes.js";
import chatSessionRoute from "./routes/chatSessionsRouters.js";
import authRoute from "./routes/authRoutes.js";

// Import new AI-powered routes
import itineraryRoute from "./routes/itineraryRoutes.js";
import searchRoute from "./routes/searchRoutes.js";
import mapsRoute from "./routes/mapsRoutes.js";
import integratedSearchRoute from "./routes/integrated-search.js";
import chatRoute from "./routes/chatRoutes.js";
import testMapsRoute from "./routes/test-maps.js";

// Import hybrid search system routes
import hybridSearchRoute from "./routes/hybridSearchRoutes.js";
import adminRoute from "./routes/adminRoutes.js";
import exploreRoute from "./routes/exploreRoutes.js";

// Import payment routes
import paymentRoute from "./routes/paymentRoutes.js";


// Import database connection
import { connectDB } from "./config/db.js";

// Import middleware
import { bypassAuth } from "./middleware/auth.js";

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Connect to database
connectDB();

// CORS configuration - MUST BE FIRST
// Parse allowed origins from environment variable (comma-separated for multiple URLs)
const getAllowedOrigins = () => {
  // Always allow localhost origins for development/testing
  const localhostOrigins = [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:3001', 
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  
  if (NODE_ENV === 'production') {
    // Read from environment variable, support multiple URLs separated by comma
    const frontendUrls = process.env.FRONTEND_URL || process.env.FRONTEND_URLS;
    if (frontendUrls) {
      const productionUrls = frontendUrls.split(',').map(url => url.trim()).filter(url => url);
      // Combine localhost (for testing) + production URLs
      return [...localhostOrigins, ...productionUrls];
    } 
    // Fallback: allow localhost even in production (for testing)
    console.warn('⚠️  WARNING: FRONTEND_URL not set in production. Only localhost origins are allowed.');
    return localhostOrigins;
  } else {
    // Development origins
    return localhostOrigins;
  }
};

const allowedOrigins = getAllowedOrigins();
console.log(`✅ CORS: Allowed origins:`, allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS: Origin ${origin} not allowed. Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always log CORS info for debugging (especially important in production)
  if (req.method === 'OPTIONS' || origin) {
    console.log(`🔍 [CORS] ${req.method} ${req.url} | Origin: ${origin || 'none'}`);
  }
  
  if (req.method === 'OPTIONS') {
    // Check if origin is allowed
    const isOriginAllowed = !origin || allowedOrigins.includes(origin);
    
    if (isOriginAllowed) {
      // Set CORS headers for preflight
      res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0] || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      console.log(`✅ [CORS] Preflight allowed for origin: ${origin || 'none'}`);
      res.status(200).end();
      return;
    } else {
      // Origin not allowed
      console.warn(`❌ [CORS] Preflight rejected. Origin: ${origin} | Allowed:`, allowedOrigins);
      res.status(403).json({ 
        error: 'CORS: Origin not allowed',
        origin: origin,
        allowedOrigins: allowedOrigins
      });
      return;
    }
  }
  
  // For non-OPTIONS requests, CORS middleware already handles headers
  // But we ensure origin is set correctly
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`⚠️  [CORS] Origin ${origin} not in allowed list for ${req.method} ${req.url}`);
  }
  
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Serve static files from public directory
app.use(express.static('public'));
// Body parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON format' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}



// API Routes
// Auth routes for email/password
app.use("/api/auth", authRoute);

// Protected routes with bypass authentication
app.use("/api/trips", bypassAuth, tripRoute);
app.use("/api/users", bypassAuth, userRoute);
app.use("/api/subscriptions", userSubscriptionsRoute);
app.use("/api/chat-sessions", chatSessionRoute);

// Public routes
app.use("/api/plans", plansRoute);
app.use("/api/places", placesRoute);

// New AI-powered routes (public access)
app.use("/api/itinerary", itineraryRoute);
app.use("/api/search", searchRoute);
app.use("/api/maps", mapsRoute);
app.use("/api/integrated-search", integratedSearchRoute);
app.use("/api/chat", chatRoute);
app.use("/api/test-maps", testMapsRoute);
app.use("/api/explore", exploreRoute);

// Hybrid search system routes
app.use("/api/hybrid-search", hybridSearchRoute);
app.use("/api/admin/partner-places", adminRoute);

// Payment routes
app.use("/api/payments", paymentRoute);

// Health check endpoint
app.get("/api/health", (_, res) => {
    res.status(200).json({
        success: true,
        message: "Veena Travel API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: NODE_ENV
    });
});

// API documentation endpoint
app.get("/api/docs", (_, res) => {
    res.status(200).json({
        success: true,
        message: "Veena Travel API Documentation",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        
        // Authentication
        authentication: {
            "type": "JWT Token",
            "method": "Bearer Token",
            "format": "Authorization: Bearer <token>",
            "howToGet": "Register or Login to get JWT token",
            "endpoints": {
                "POST /api/auth/register": "Register new user (Email, Password, Name)",
                "POST /api/auth/login": "Login user (Email, Password)",
                "POST /api/auth/verify": "Verify JWT token",
                "GET /api/auth/profile": "Get user profile",
                "PUT /api/auth/change-password": "Change password"
            }
        },
        
        // User Management
        users: {
            description: "User profile and management",
            requiresAuth: true,
            endpoints: {
                "GET /api/users/profile": "Get user profile",
                "PUT /api/users/profile": "Update user profile",
                "GET /api/users/subscriptions": "Get user subscriptions"
            }
        },
        
        // Travel Plans & Itineraries
        plans: {
            description: "Travel plans and itinerary management",
            endpoints: {
                "GET /api/plans": "Get all travel plans (public)",
                "GET /api/plans/:id": "Get plan details",
                "POST /api/plans": "Create new plan (requires auth)",
                "PUT /api/plans/:id": "Update plan (requires auth)"
            }
        },
        
        // Places & Destinations
        places: {
            description: "Places, destinations, and location search",
            endpoints: {
                "GET /api/places": "Get places (public)",
                "GET /api/places/:id": "Get place details",
                "GET /api/places/search": "Search places",
                "POST /api/places": "Add new place (requires auth)"
            }
        },
        
        // AI Chat
        chat: {
            description: "AI-powered chat assistant for travel planning",
            requiresAuth: true,
            messageLimits: {
                "free": "5 messages",
                "premium": "Unlimited",
                "pro": "Unlimited"
            },
            endpoints: {
                "POST /api/chat/message": "Send message to AI chat assistant (tracks usage)",
                "POST /api/chat/modify-itinerary": "Modify itinerary based on chat request",
                "POST /api/chat/recommendations": "Get travel recommendations",
                "GET /api/chat-sessions": "Get chat sessions",
                "GET /api/chat-sessions/:id": "Get chat session details"
            }
        },
        
        // Subscriptions
        subscriptions: {
            description: "User subscription management",
            requiresAuth: true,
            plans: {
                "free": {
                    price: "0 VND",
                    trips: "3",
                    messages: "5",
                    duration: "30 days"
                },
                "premium": {
                    price: "199,000 VND",
                    trips: "20",
                    messages: "Unlimited",
                    duration: "30 days"
                },
                "pro": {
                    price: "499,000 VND",
                    trips: "Unlimited",
                    messages: "Unlimited",
                    duration: "30 days"
                }
            },
            endpoints: {
                "GET /api/subscriptions/current": "Get current subscription",
                "GET /api/subscriptions/history": "Get subscription history",
                "GET /api/subscriptions/check-trip-limit": "Check trip limit",
                "GET /api/subscriptions/check-message-limit": "Check message limit",
                "GET /api/subscriptions/test-premium": "Test premium access",
                "GET /api/subscriptions/test-pro": "Test pro access",
                "GET /api/subscriptions/admin/all": "Get all subscriptions (admin only)",
                "PUT /api/subscriptions/admin/:id": "Update subscription (admin only)"
            }
        },
        
        // Payments (PayOS)
        payments: {
            description: "Payment processing with PayOS",
            requiresAuth: true,
            endpoints: {
                "POST /api/payments/create": "Create payment link (requires auth)",
                "GET /api/payments/info/:orderCode": "Get payment info (requires auth)",
                "GET /api/payments/user-payments": "Get user payments (requires auth)",
                "POST /api/payments/cancel/:orderCode": "Cancel payment (requires auth)",
                "GET /api/payments/return": "Payment return callback (public)",
                "POST /api/payments/webhook": "PayOS webhook handler (public)",
                "GET /api/payments/stats": "Payment statistics (admin only)"
            }
        },
        
        // Trips & Itineraries
        trips: {
            description: "Trip and itinerary management",
            requiresAuth: true,
            endpoints: {
                "GET /api/trips": "Get user trips",
                "POST /api/trips": "Create new trip",
                "GET /api/trips/:id": "Get trip details",
                "PUT /api/trips/:id": "Update trip",
                "DELETE /api/trips/:id": "Delete trip",
                "POST /api/itinerary/generate": "Generate itinerary with AI",
                "GET /api/itinerary/:id": "Get itinerary details"
            }
        },
        
        // Search & Explore
        search: {
            description: "Search and explore features",
            endpoints: {
                "GET /api/explore": "Explore places and destinations",
                "GET /api/explore/nearby": "Find nearby places (hybrid search with radius filter)",
                "GET /api/explore/categories": "List available categories with counts",
                "GET /api/explore/featured": "Get curated/featured places",
                "GET /api/explore/place/:placeId": "Get place details by Google placeId",
                "GET /api/explore/:id": "Get place details by internal ID",
                "POST /api/search": "Universal search",
                "POST /api/hybrid-search": "Hybrid search (semantic + keyword)",
                "GET /api/maps/geocode": "Geocode address",
                "GET /api/maps/nearby": "Find nearby places",
                "POST /api/maps/directions": "Get directions"
            }
        },
        
        // Admin Features
        admin: {
            description: "Administrative features",
            requiresAuth: true,
            requiresRole: "admin",
            endpoints: {
                "GET /api/admin/partner-places": "Get partner places",
                "POST /api/admin/partner-places": "Add partner place",
                "PUT /api/admin/partner-places/:id": "Update partner place",
                "DELETE /api/admin/partner-places/:id": "Delete partner place",
                "GET /api/admin/stats": "Get admin statistics"
            }
        },
        
        // Error Response Format
        errorResponse: {
            "success": false,
            "message": "Error message",
            "code": "ERROR_CODE",
            "data": {}
        },
        
        // Success Response Format
        successResponse: {
            "success": true,
            "message": "Success message",
            "data": {}
        },
        
        // Subscription Error Response (Chat Limits)
        chatLimitError: {
            "success": false,
            "message": "Bạn đã hết lượt chat miễn phí. Vui lòng nâng cấp lên Premium để tiếp tục chat không giới hạn!",
            "code": "MESSAGE_LIMIT_EXCEEDED",
            "current": 5,
            "limit": 5,
            "upgradeUrl": "/subscriptions/upgrade"
        }
    });
});

// 404 handler
app.use((_, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        message: "The requested endpoint does not exist"
    });
});

// Global error handling middleware
app.use((error, _, res, __) => {
    console.error("Global Error Handler:", {
        message: error.message,
        stack: NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: "Validation Error",
            message: error.message,
            details: NODE_ENV === 'development' ? error.errors : undefined
        });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: "Invalid ID format",
            message: "The provided ID is not valid"
        });
    }

    if (error.code === 11000) {
        return res.status(409).json({
            success: false,
            error: "Duplicate Entry",
            message: "A record with this information already exists"
        });
    }

    // Default error response
    res.status(error.status || 500).json({
        success: false,
        error: "Internal Server Error",
        message: NODE_ENV === 'development' ? error.message : "Something went wrong",
        ...(NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Graceful shutdown handling
const server = app.listen(PORT, () => {
    console.log(`🚀 Veena Travel Server started successfully`);
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🌐 Server running on port: ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🤖 Ready to serve VeenaTravel AI Chat!`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

