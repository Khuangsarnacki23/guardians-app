// backend/app.js
// Exports a configured Express app WITHOUT calling listen().
// - Vercel imports this from /api/index.js as a serverless handler
// - local dev imports this from server.js and calls listen()
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// Same-origin in production (frontend and API share the Vercel domain),
// so CORS is only actually needed for local dev against a separate port.
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const goalsRoutes = require("./routes/goalsRoutes");
const sessionsRoutes = require("./routes/sessionsRoutes");
const trainingProfileRoutes = require("./routes/trainingProfileRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const coachDocsRoutes = require("./routes/coachDocsRoutes");
const randomHighlightRoutes = require("./routes/randomHighlightRoutes");
const uploadsRoutes = require("./routes/uploadsRoutes");

const { requireAuth } = require("@clerk/express");

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.VERCEL ? "vercel" : "local" });
});

app.use("/api/uploads", requireAuth(), uploadsRoutes);
app.use("/api/goals", requireAuth(), goalsRoutes);
app.use("/api/sessions", requireAuth(), sessionsRoutes);
app.use("/api/training-profile", requireAuth(), trainingProfileRoutes);
app.use("/api/assistant", requireAuth(), assistantRoutes);
app.use("/api/coach-docs", requireAuth(), coachDocsRoutes);
app.use("/api/random-guardians-highlight", randomHighlightRoutes);

// JSON 404 so the frontend never gets an HTML error page back from fetch()
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ error: `No API route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

module.exports = app;
