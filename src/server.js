import express from "express";
import tripRoute from "./routes/tripsRouters.js";
import userRoute from "./routes/usersRouters.js";
import destinationRoute from "./routes/destinationsRouters.js";
import itineraryRoute from "./routes/itinerariesRouters.js";
import reviewRoute from "./routes/reviewsRouters.js";
import chatSessionRoute from "./routes/chatSessionsRouters.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5001

const app = express();

connectDB();

// Middleware
app.use(express.json()); // Fixed: Added parentheses

// Routes
app.use("/api/trips", tripRoute);
app.use("/api/users", userRoute);
app.use("/api/destinations", destinationRoute);
app.use("/api/itineraries", itineraryRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/chat-sessions", chatSessionRoute);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        message: "Veena Travel API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error("Error:", error);
    res.status(500).json({
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

app.listen(PORT, ()=> {
    console.log(`Veena Travel Server started on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

