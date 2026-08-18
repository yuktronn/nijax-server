import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import contactRoutes from "./routes/contact.js";
import freeApplicationRoutes from "./routes/freeApplication.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ========================================
   CORS CONFIGURATION
======================================== */
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://yuktron.com",
    "https://www.yuktron.com"
  ],
  credentials: true
}));

/* ========================================
   MIDDLEWARE
======================================== */
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ========================================
   ROUTES
======================================== */
app.use("/api/contact", contactRoutes);
app.use("/api/free-application", freeApplicationRoutes);

/* ========================================
   ROOT ROUTE
======================================== */
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #05080c; color: #ffffff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #00ff88; letter-spacing: 2px;">YUKTRON API</h1>
      <p style="color: #9ca3af; font-size: 18px;">The production backend server is active and running successfully.</p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        To submit messages, send a POST request to <code>/api/contact</code>.<br>
        To check server health, visit <a href="/api/health" style="color: #00ff88; text-decoration: none;">/api/health</a>.
      </p>
      <a href="https://yuktron.com" style="margin-top: 30px; display: inline-block; padding: 12px 24px; background-color: #00ff88; color: #05080c; text-decoration: none; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Visit Main Website</a>
    </div>
  `);
});

/* ========================================
   HEALTH CHECK
======================================== */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server healthy",
    mongoState: mongoose.connection.readyState,
    uptime: process.uptime()
  });
});

/* ========================================
   ENVIRONMENT DEBUG
======================================== */
console.log("ENVIRONMENT CHECK");
console.log(
  "MONGO_URI:",
  process.env.MONGO_URI ? "EXISTS" : "MISSING"
);
console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "EXISTS" : "MISSING"
);

/* ========================================
   DATABASE CONNECTION
======================================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error");
    console.error(err.message);
  });
