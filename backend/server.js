/**
 * server.js — Express application entry point
 *
 * Loads environment variables, mounts routes, and starts the HTTP server.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in HF_API_KEY
 *   2. npm install
 *   3. npm start   (or: npm run dev  for auto-reload with nodemon)
 */

require("dotenv").config(); // Load .env into process.env

const express = require("express");
const cors = require("cors");
const path = require("path");
const nlpRoutes = require("./routes/nlpRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Allow the frontend (served from any origin locally) to call the API
app.use(cors());

// Serve the frontend static files so backend + frontend deploy as one service
app.use(express.static(path.join(__dirname, "../frontend")));

// Parse JSON request bodies
app.use(express.json());

// Simple request logger — helpful when reading the code / debugging
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// All shopping / NLP routes are namespaced under /api
app.use("/api", nlpRoutes);

// Health check — useful to verify the server is running
app.get("/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});

// Catch-all route to serve the main HTML file for any non-API routes 
// (Useful if you add frontend routing later, or just to serve the root '/')
app.get("*", (req, res) => {
    // Only intercept if it's not an API route
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "API Route Not Found" });
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🛒  Voice Shopping Assistant backend running on http://localhost:${PORT}`);
    console.log(`    Health check: http://localhost:${PORT}/health`);
    console.log(
        `    HF_API_KEY: ${process.env.HF_API_KEY ? "✅ loaded" : "⚠️  NOT SET — rule-based fallback will be used"}\n`
    );
});
