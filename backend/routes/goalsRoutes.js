// routes/goalsRoutes.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/mongo");

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const goalsCollection = db.collection("goals");

    const clerkUserId = req.auth.userId;
    const { type } = req.query; 

    const query = { userId: clerkUserId };
    if (type) {
      query.type = type;      
    }

    const results = await goalsCollection
      .find(query)
      .sort({ createdAt: -1 }) 
      .toArray();

    res.json({ goals: results });
  } catch (err) {
    console.error("Error fetching goals:", err);
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});


router.post("/", async (req, res) => {
  try {
    const db = await getDb();
    const goalsCollection = db.collection("goals");
    const usersCollection = db.collection("users");


    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }


    await usersCollection.updateOne(
      { _id: clerkUserId },
      {
        $setOnInsert: {
          role: "player",
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );


    const {
      type,           
      totals = {},   
      exerciseGoals,
      pitchGoals,    
    } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: type",
      });
    }

    const now = new Date();

    const baseTotals = {
      minutes:
        totals.minutes !== undefined ? Number(totals.minutes) || 0 : 0,
      reps:
        totals.reps !== undefined ? Number(totals.reps) || 0 : 0,
    };


    if (type === "gym") {
      baseTotals.sets =
        totals.sets !== undefined ? Number(totals.sets) || 0 : 0;
    } else {
      baseTotals.accuracy =
        totals.accuracy !== undefined ? Number(totals.accuracy) || 0 : 0;
    }

    const doc = {
      userId: clerkUserId,
      type,
      periodStart: startOfToday(),
      totals: baseTotals,
      createdAt: now,
      updatedAt: now,
    };

    if (type === "gym") {
      const safeExerciseGoals = Array.isArray(exerciseGoals)
        ? exerciseGoals.map((g) => ({
            name: g.name || "",
            minutes: g.minutes !== undefined ? Number(g.minutes) || 0 : 0,
            reps: g.reps !== undefined ? Number(g.reps) || 0 : 0,
            max: g.max || "", 
          }))
        : [];

      doc.exerciseGoals = safeExerciseGoals;
    } else if (type === "baseball") {
      const safePitchGoals = Array.isArray(pitchGoals)
        ? pitchGoals.map((g) => ({
            name: g.name || "",
            minutes: g.minutes !== undefined ? Number(g.minutes) || 0 : 0,
            reps: g.reps !== undefined ? Number(g.reps) || 0 : 0,
            fastestSpeed:
              g.fastestSpeed !== undefined ? Number(g.fastestSpeed) || 0 : 0,
            accuracy:
              g.accuracy !== undefined ? Number(g.accuracy) || 0 : 0, 
          }))
        : [];

      doc.pitchGoals = safePitchGoals;
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown goal type: ${type}`,
      });
    }
    const {
      indexPitchGoals,
      indexExerciseGoals,
    } = require("../services/pineconeIndexer");
    const result = await goalsCollection.insertOne(doc);
    await indexPitchGoals(clerkUserId, doc.pitchGoals || []);
    await indexExerciseGoals(clerkUserId, doc.exerciseGoals || []);
    res.status(201).json({
      success: true,
      goalId: result.insertedId,
      goal: doc,
    });
  } catch (err) {
    console.error("Error saving goals:", err);
    res.status(500).json({ success: false, error: "Failed to save goals" });
  }
});

module.exports = router;
