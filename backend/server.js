const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

const cors = require("cors");

// put this near the top, BEFORE routes and Clerk/auth middleware
app.use(
  cors({
    origin: "http://localhost:3000", // explicitly allow your React dev origin
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.use(express.json());
app.use(express.urlencoded());

const goalsRoutes = require("./routes/goalsRoutes");
const sessionsRoutes = require("./routes/sessionsRoutes");
const trainingProfileRoutes = require("./routes/trainingProfileRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const coachDocsRoutes = require("./routes/coachDocsRoutes");
const randomHighlightRoutes = require("./routes/randomHighlightRoutes");


const { requireAuth } = require("@clerk/express");

app.get("/api/health", (req, res) => {
  console.log("GET /api/health hit");
  res.json({ ok: true });
});

app.use("/api/goals", requireAuth(), goalsRoutes);
app.use("/api/sessions", requireAuth(), sessionsRoutes);
app.use("/api/training-profile", requireAuth(), trainingProfileRoutes);
app.use("/api/assistant", requireAuth(), assistantRoutes);
app.use("/api/coach-docs", requireAuth(), coachDocsRoutes);
app.use("/api/random-guardians-highlight", randomHighlightRoutes);
app.listen(PORT, "0.0.0.0", () => {
  console.log("API listening on http://0.0.0.0:5000");
});