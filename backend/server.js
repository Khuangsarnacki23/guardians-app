// backend/server.js
// Local development entry point only. Vercel does NOT use this file --
// it imports backend/app.js through /api/index.js instead.
const app = require("./app");

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
