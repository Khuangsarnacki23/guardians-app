// server-test.js
console.log("🔧 server-test.js starting...");

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5001;

// 🔹 Log every incoming request
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.get("/api/health", (req, res) => {
  console.log("✅ GET /api/health hit (server-test)");
  res.json({ ok: true });
});

// Optional heartbeat so you know it's still alive
setInterval(() => console.log("⏱ still running..."), 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 TEST API listening on http://0.0.0.0:${PORT}`);
});
