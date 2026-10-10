import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import apiRouter from "./routes/index.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const allowedOrigins = [
  "https://medibook-fcwr.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/v1", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

// Global error middleware - must be last
app.use((err, req, res, next) => {
  // PostgreSQL unique constraint violation → return 409 Conflict
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: "This time slot is already booked. Please choose another slot.",
      code: "SLOT_CONFLICT",
      errors: [],
    });
  }

  const statusCode = err.statusCode || 500;
  const message    = err.message    || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    code: err.code || err.errorCode || null,
  });
});

export default app;
