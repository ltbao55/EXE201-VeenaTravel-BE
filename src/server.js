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
import vnpayRoute from "./routes/vnpayRoutes.js";


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
const corsOptions = {
  origin: NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // Replace with your production domain
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:3001', 
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.use((req, res, next) => {
  // Debug CORS headers
  console.log(`🔍 [CORS DEBUG] ${req.method} ${req.url}`);
  console.log(`🔍 [CORS DEBUG] Origin: ${req.headers.origin}`);
  console.log(`🔍 [CORS DEBUG] User-Agent: ${req.headers['user-agent']}`);
  
  if (req.method === 'OPTIONS') {
    console.log('🔍 [CORS DEBUG] Handling OPTIONS preflight request');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
    console.log('✅ [CORS DEBUG] OPTIONS request handled');
    return;
  }
  
  // Add CORS headers to all responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  console.log('✅ [CORS DEBUG] CORS headers added to response');
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
app.use("/api/subscriptions", bypassAuth, userSubscriptionsRoute);
app.use("/api/chat-sessions", bypassAuth, chatSessionRoute);

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
app.use("/api/vnpay", vnpayRoute);

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
        notice: "🚨 AUTHENTICATION IS CURRENTLY DISABLED - ALL ROUTES ARE PUBLIC",
        endpoints: {
            "GET /api/health": "Health check",
            "GET /api/plans": "Get travel plans (public)",
            "GET /api/places": "Get places (public)",
            "POST /api/auth/register": "Register with email/password (still available)",
            "POST /api/auth/login": "Login with email/password (still available)",
            "GET /api/auth/profile": "Get user profile (auth bypassed)",
            "PUT /api/auth/change-password": "Change password (auth bypassed)",
            "POST /api/users": "User management (auth bypassed)",
            "POST /api/trips": "Trip management (auth bypassed)",
            "POST /api/subscriptions": "Subscription management (auth bypassed)",
            "POST /api/chat-sessions": "Chat sessions (auth bypassed)"
        },
        authentication: {
            "status": "DISABLED",
            "note": "All protected routes now use mock user authentication",
            "original": {
                "Firebase": "Bearer <firebase_token> - for Firebase authenticated users",
                "JWT": "Bearer <jwt_token> - for email/password authenticated users"
            }
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

