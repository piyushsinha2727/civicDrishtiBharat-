import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import connectDB from "./db.js";

import authRoutes from "./routes/auth.js";
import complaintRoutes from "./routes/complaint.js";
import engineerRoutes from "./routes/engineers.js";
import leaveRoutes from "./routes/leave.js";
import heatmapRoutes from "./routes/heatmap.js";
import floodRiskRoutes from "./routes/floodRisk.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Auto MongoDB connection middleware for Serverless environment (Vercel)
// MUST be before routes so DB is connected before any query
app.use(async (req, res, next) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        next();
    } catch (err) {
        console.error("Database connection failure in middleware:", err);
        res.status(500).json({ error: "Database connection failure", message: err.message });
    }
});

// Root route
app.get("/", (req, res) => {
    console.log("Root route hit!");
    res.json({
        message: "UrbanReport AI Backend is running with MongoDB Atlas!",
        version: "1.0.0",
        status: "Online"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "UP",
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/engineers", engineerRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/heatmap", heatmapRoutes);
app.use("/api/flood-risk", floodRiskRoutes);

// Static files for documents
app.use("/documents", express.static(path.join(__dirname, "public/documents")));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        path: req.url
    });
});



const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    console.log("Starting server initialization...");
    connectDB().then(() => {
        console.log("Database connected successfully. Starting server...");
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }).catch(err => {
        console.error("Startup error:", err);
    });
}

export default app;
