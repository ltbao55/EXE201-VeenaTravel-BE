import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
import vectorSearchRoute from './routes/vectorSearchRoutes.js';
import aiRoute from './routes/aiRoutes.js';
import authRoute from "./routes/authRoutes.js";

// Import database connection
import { connectDB } from "./config/db.js";

// Import middleware
import { verifyToken } from "./middleware/auth.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Connect to database
connectDB();

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

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'file://'], // Allow local development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

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

// Custom request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// API Routes
// Auth routes for email/password
app.use("/api/auth", authRoute);

// Protected routes with dual authentication (Firebase or JWT)
app.use("/api/trips", verifyToken, tripRoute);
app.use("/api/users", verifyToken, userRoute);
app.use("/api/subscriptions", verifyToken, userSubscriptionsRoute);
app.use("/api/chat-sessions", verifyToken, chatSessionRoute);

// Public routes
app.use("/api/plans", plansRoute);
app.use("/api/places", placesRoute);

// AI and vector search routes (public for now)
app.use("/api/vector-search", vectorSearchRoute);
app.use("/api/ai", aiRoute);

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
        endpoints: {
            "GET /api/health": "Health check",
            "GET /api/plans": "Get travel plans (public)",
            "GET /api/places": "Get places (public)",
            "POST /api/auth/register": "Register with email/password",
            "POST /api/auth/login": "Login with email/password",
            "GET /api/auth/profile": "Get user profile (JWT auth)",
            "PUT /api/auth/change-password": "Change password (JWT auth)",
            "POST /api/users": "User management (requires auth)",
            "POST /api/trips": "Trip management (requires auth)",
            "POST /api/subscriptions": "Subscription management (requires auth)",
            "POST /api/chat-sessions": "Chat sessions (requires auth)",
            "GET /api/vector-search": "Vector search for places",
            "POST /api/ai": "AI chat and recommendations"
        },
        authentication: {
            "Firebase": "Bearer <firebase_token> - for Firebase authenticated users",
            "JWT": "Bearer <jwt_token> - for email/password authenticated users"
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

