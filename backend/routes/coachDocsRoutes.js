// routes/coachDocsRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const { getDb } = require("../db/mongo");
const { indexCoachDocChunks } = require("../services/pineconeIndexer");

router.use(express.json());

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const file = req.file;
    const { title: rawTitle, description } = req.body || {};

    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    const title = rawTitle || file.originalname;


    const mime = file.mimetype || "";
    if (
      !mime.startsWith("text/") &&
      mime !== "application/json" &&
      mime !== "application/x-yaml" &&
      mime !== "application/x-yml"
    ) {
      return res.status(400).json({
        error:
          "Unsupported file type for now. Please upload .txt, .md, or other text formats.",
      });
    }

    const text = file.buffer.toString("utf-8");
    if (!text.trim()) {
      return res.status(400).json({ error: "File appears to be empty." });
    }

    const db = await getDb();
    const docs = db.collection("coachDocuments");

    const doc = {
      userId: clerkUserId,
      title,
      description: description || "",
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await docs.insertOne(doc);
    const storedDoc = { _id: result.insertedId, ...doc };


    try {
      await indexCoachDocChunks(storedDoc, text);
    } catch (err) {
      console.error("Error indexing coach doc in Pinecone:", err);
    }

    res.json({
      success: true,
      document: storedDoc,
    });
  } catch (err) {
    console.error("Error in POST /api/coach-docs:", err);
    res.status(500).json({ error: "Failed to upload coach document" });
  }
});


router.get("/", async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDb();
    const docs = db.collection("coachDocuments");

    const list = await docs
      .find({ userId: clerkUserId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ documents: list });
  } catch (err) {
    console.error("Error in GET /api/coach-docs:", err);
    res.status(500).json({ error: "Failed to load coach documents" });
  }
});

module.exports = router;
