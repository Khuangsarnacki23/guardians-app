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

// Request logging. Vercel captures stdout/stderr into Runtime Logs, so this
// gives one line per request with status and duration -- enough to see which
// call failed and whether it failed fast (config) or slow (network timeout).
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(
      `[req] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${
        Date.now() - startedAt
      }ms`
    );
  });
  next();
});

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

// Unauthenticated diagnostic: reports which required env vars are present and
// whether Mongo actually connects. Reports presence only -- never values.
app.get("/api/health/config", async (req, res) => {
  const required = [
    "MONGODB_URI",
    "CLERK_SECRET_KEY",
    "CLERK_PUBLISHABLE_KEY",
    "OPENAI_API_KEY",
    "PINECONE_API_KEY",
    "PINECONE_INDEX_NAME",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_GYM_BUCKET",
    "AWS_S3_PITCHING_BUCKET",
  ];

  const env = {};
  const missing = [];
  required.forEach((key) => {
    const present = Boolean(process.env[key]);
    env[key] = present ? "set" : "MISSING";
    if (!present) missing.push(key);
  });

  let mongo = "not attempted";
  try {
    const { getDb } = require("./db/mongo");
    const db = await getDb();
    await db.command({ ping: 1 });
    mongo = "connected";
  } catch (err) {
    mongo = `FAILED: ${err.name}: ${err.message}`.slice(0, 300);
  }

  res.json({ env, missing, mongo });
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
  const { sendError } = require("./lib/errors");
  const status = err.status || err.statusCode || 500;

  if (status !== 500) {
    console.error(`[ERROR ${status}] ${req.method} ${req.originalUrl}:`, err.message);
    return res.status(status).json({ error: err.message });
  }

  return sendError(res, err, "Internal server error", {
    route: `${req.method} ${req.originalUrl}`,
  });
});

module.exports = app;
