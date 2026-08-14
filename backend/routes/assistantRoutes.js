// routes/assistantRoutes.js
const express = require("express");
const router = express.Router();

const { getDb } = require("../db/mongo");
const { getPineconeIndex } = require("../db/pinecone");
const { embedText, chatWithContext } = require("../db/openai");
const { buildProfileSummary } = require("../services/profileText");
const { sendError } = require("../lib/errors");

// 👇 add JSON parser just for this router (guards against app-level issues)
router.use(express.json());

// POST /api/assistant/query
router.post("/query", async (req, res) => {
  // Tracks how far the request got, so a 500 says which dependency failed
  // (mongo / openai-embed / pinecone-query / openai-chat) instead of just
  // "Failed to answer question".
  let stage = "start";

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

    stage = "mongo";
    const db = await getDb();

    /* 1) Load training profile from Mongo */
    const profiles = db.collection("trainingProfiles");
    const profileDoc = await profiles.findOne({ userId: clerkUserId });
    const profileSummary = buildProfileSummary(profileDoc);

    /* 2) Embed the user's question */
    stage = "openai-embed";
    const queryVector = await embedText(userQuestion);

    /* 3) Query Pinecone for this user's most relevant sessions/goals.
       Retrieval is an enhancement, not a requirement -- if Pinecone is
       misconfigured or the index is empty, still answer using the profile
       rather than failing the whole request. */
    stage = "pinecone-query";
    let contextChunks = [];
    try {
      const index = getPineconeIndex();
      const pineconeRes = await index.namespace(clerkUserId).query({
        vector: queryVector,
        topK: 6,
        includeMetadata: true,
      });

      contextChunks = (pineconeRes.matches || [])
        .map((m) => m.metadata?.summary)
        .filter(Boolean);
    } catch (pineErr) {
      console.error(
        `[WARN] Pinecone retrieval failed, answering without context :: ${pineErr?.name}: ${pineErr?.message}`
      );
    }

    /* 4) Call OpenAI chat with profile + context */
    stage = "openai-chat";
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
    sendError(res, err, "Failed to answer question", {
      route: "POST /api/assistant/query",
      stage,
      // OpenAI SDK errors carry these; they identify auth vs quota vs model.
      openaiStatus: err?.status,
      openaiType: err?.type || err?.error?.type,
      openaiCode: err?.code || err?.error?.code,
    });
  }
});

module.exports = router;
