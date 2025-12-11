// routes/trainingProfileRoutes.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/mongo");



router.get("/", async (req, res) => {
    try {
      const db = await getDb();
      const profiles = db.collection("trainingProfiles");
      const clerkUserId = req.auth?.userId;
  
      if (!clerkUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
  
      const doc = await profiles.findOne({ userId: clerkUserId });
  
      if (!doc) {
        return res.json({ profile: null });
      }
  
      const { _id, userId, createdAt, updatedAt, ...rest } = doc;
      return res.json({ profile: rest });
    } catch (err) {
      console.error("Error fetching training profile:", err);
      res.status(500).json({ error: "Failed to fetch training profile" });
    }
  });
  
router.post("/", async (req, res) => {
  try {
    const db = await getDb();
    const profiles = db.collection("trainingProfiles");
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let incoming = req.body || {};


    if (
      incoming.profile &&
      typeof incoming.profile === "object" &&
      !Array.isArray(incoming.profile)
    ) {
      incoming = incoming.profile;
    }

    console.log("Incoming training profile payload:", incoming);

    const now = new Date();

    await profiles.updateOne(
      { userId: clerkUserId },
      {
        $set: {
          ...incoming,
          userId: clerkUserId,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const doc = await profiles.findOne({ userId: clerkUserId });

    if (!doc) {
      return res
        .status(500)
        .json({ error: "Profile not found after upsert" });
    }

    const { _id, userId, createdAt, updatedAt, ...rest } = doc;

    return res.json({
      success: true,
      profile: rest,
    });
  } catch (err) {
    console.error("Error saving training profile:", err);
    res.status(500).json({ error: "Failed to save training profile" });
  }
});

module.exports = router;
