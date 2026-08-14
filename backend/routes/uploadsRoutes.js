// routes/uploadsRoutes.js
// Hands out short-lived presigned S3 PUT URLs so the browser can upload videos
// directly to S3, bypassing Vercel's 4.5MB serverless request body limit.
const express = require("express");
const router = express.Router();

const { getPresignedUploadUrl } = require("../db/s3");

const GYM_BUCKET = process.env.AWS_S3_GYM_BUCKET;
const PITCHING_BUCKET = process.env.AWS_S3_PITCHING_BUCKET;

const MAX_BYTES = 200 * 1024 * 1024;

function sanitizeFilename(name) {
  if (typeof name !== "string") return "file";
  return (
    name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 120) || "file"
  );
}

router.post("/sign", async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { kind, filename, contentType, size, pitchType } = req.body || {};

    if (kind !== "gym" && kind !== "pitching") {
      return res.status(400).json({ error: "kind must be 'gym' or 'pitching'" });
    }

    if (!filename) {
      return res.status(400).json({ error: "filename is required" });
    }

    if (!contentType || !contentType.startsWith("video/")) {
      return res.status(400).json({ error: "contentType must be a video/* type" });
    }

    if (typeof size === "number" && size > MAX_BYTES) {
      return res.status(413).json({ error: "File exceeds the 200MB limit" });
    }

    const bucket = kind === "gym" ? GYM_BUCKET : PITCHING_BUCKET;
    if (!bucket) {
      return res.status(500).json({
        error: `Missing bucket env var for kind '${kind}'`,
      });
    }

    const safeName = sanitizeFilename(filename);
    // User ID is taken from the verified Clerk session, never from the client,
    // so a caller cannot sign an upload into someone else's prefix.
    const folder =
      kind === "gym"
        ? "gym-sessions"
        : `pitching-sessions/${sanitizeFilename(pitchType || "unknown")}`;
    const key = `${clerkUserId}/${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;

    const { url } = await getPresignedUploadUrl({ bucket, key, contentType });

    return res.json({ url, key });
  } catch (err) {
    console.error("Failed to sign upload:", err);
    return res.status(500).json({ error: "Failed to sign upload" });
  }
});

module.exports = router;
