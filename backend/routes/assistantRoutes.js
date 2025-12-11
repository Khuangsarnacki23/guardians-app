// routes/assistantRoutes.js
const express = require("express");
const router = express.Router();

const { getDb } = require("../db/mongo");
const { getPineconeIndex } = require("../db/pinecone");
const { embedText, chatWithContext } = require("../db/openai");
const { buildProfileSummary } = require("../services/profileText");

// 👇 add JSON parser just for this router (guards against app-level issues)
router.use(express.json());

// POST /api/assistant/query
router.post("/query", async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("[assistant] raw body:", req.body);
    const {
      question,
      q,
      message,
      text,
    } = req.body || {};

    const userQuestion =
      question || q || message || text;

    if (!userQuestion || !String(userQuestion).trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const db = await getDb();

    /* 1) Load training profile from Mongo */
    const profiles = db.collection("trainingProfiles");
    const profileDoc = await profiles.findOne({ userId: clerkUserId });
    const profileSummary = buildProfileSummary(profileDoc);

    /* 2) Embed the user's question */
    const queryVector = await embedText(userQuestion);

    /* 3) Query Pinecone for this user's most relevant sessions/goals */
    const index = getPineconeIndex();
    const namespace = clerkUserId;

    const pineconeRes = await index.namespace(namespace).query({
      vector: queryVector,
      topK: 6,
      includeMetadata: true,
    });

    const matches = pineconeRes.matches || [];
    const contextChunks = matches
      .map((m) => m.metadata?.summary)
      .filter(Boolean);

    /* 4) Call OpenAI chat with profile + context */
    const answer = await chatWithContext({
      question: userQuestion,
      profileSummary,
      contextChunks,
    });

    return res.json({
      answer,
      usedProfile: !!profileDoc,
      contextCount: contextChunks.length,
    });
  } catch (err) {
    console.error("Error in /api/assistant/query:", err);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

module.exports = router;
