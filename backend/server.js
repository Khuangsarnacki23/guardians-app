const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: true,
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

app.use("/api/goals", requireAuth(), goalsRoutes);
app.use("/api/sessions", requireAuth(), sessionsRoutes);
app.use("/api/training-profile", requireAuth(), trainingProfileRoutes);
app.use("/api/assistant", requireAuth(), assistantRoutes);
app.use("/api/coach-docs", requireAuth(), coachDocsRoutes);
app.use("/api/random-guardians-highlight", randomHighlightRoutes);
app.listen(PORT, "0.0.0.0", () => {
  console.log("API listening on http://0.0.0.0:5001");
});