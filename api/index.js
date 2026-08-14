// api/index.js
// Vercel serverless entry point. Every /api/* request is rewritten here by
// vercel.json, and Express routes it internally using the original URL.
module.exports = require("../backend/app");
