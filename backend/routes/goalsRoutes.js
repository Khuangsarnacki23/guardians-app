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

    // Ensure user doc exists
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
      type,           // "gym" | "baseball"
      totals = {},
      exerciseGoals,
      pitchGoals,
      scope = "lifetime",   // "lifetime" | "dated"
      targetDate,           // ISO string when scope === "dated"
    } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: type",
      });
    }

    // ---- Normalize target date & create a stable date key ----
    let normalizedTargetDate = null; // Date object (optional)
    let targetDateKey = null;        // "YYYY-MM-DD" string we use for matching

    if (scope === "dated") {
      if (!targetDate) {
        return res.status(400).json({
          success: false,
          error: "targetDate is required when scope is 'dated'",
        });
      }

      const d = new Date(targetDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid targetDate",
        });
      }

      // We’ll use UTC to be consistent
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      targetDateKey = `${year}-${month}-${day}`;

      // You can still keep the full Date object if you like
      normalizedTargetDate = d;
    }

    const now = new Date();

    // ---- Build base totals ----
    const baseTotals = {
      minutes:
        totals.minutes !== undefined ? Number(totals.minutes) || 0 : 0,
      reps:
        totals.reps !== undefined ? Number(totals.reps) || 0 : 0,
    };

    if (type === "gym") {
      baseTotals.sets =
        totals.sets !== undefined ? Number(totals.sets) || 0 : 0;
    } else if (type === "baseball") {
      baseTotals.accuracy =
        totals.accuracy !== undefined ? Number(totals.accuracy) || 0 : 0;
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown goal type: ${type}`,
      });
    }

    // ---- Filter: one goal per (userId, type, scope, targetDateKey) ----
    const filter = {
      userId: clerkUserId,
      type,
      scope,
    };

    if (scope === "dated") {
      filter.targetDateKey = targetDateKey;
    }

    // ---- Normalize exercise / pitch goals ----
    let safeExerciseGoals = [];
    let safePitchGoals = [];

    if (type === "gym") {
      safeExerciseGoals = Array.isArray(exerciseGoals)
        ? exerciseGoals.map((g) => ({
            name: g.name || "",
            minutes: g.minutes !== undefined ? Number(g.minutes) || 0 : 0,
            reps: g.reps !== undefined ? Number(g.reps) || 0 : 0,
            max: g.max || "",
          }))
        : [];
    } else if (type === "baseball") {
      safePitchGoals = Array.isArray(pitchGoals)
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
    }

    // ---- Build update doc ----
    const update = {
      $set: {
        scope,
        targetDate: normalizedTargetDate || null, // actual Date
        targetDateKey: targetDateKey || null,     // "YYYY-MM-DD" (used for matching)
        totals: baseTotals,
        updatedAt: now,
        // keep periodStart if you still use it for anything
        periodStart: startOfToday(),
      },
      $setOnInsert: {
        userId: clerkUserId,
        type,
        createdAt: now,
      },
    };

    if (type === "gym") {
      update.$set.exerciseGoals = safeExerciseGoals;
    } else if (type === "baseball") {
      update.$set.pitchGoals = safePitchGoals;
    }

    const { indexPitchGoals, indexExerciseGoals } =
    require("../services/pineconeIndexer");

  // ---- Upsert (create or update the one matching doc) ----
  await goalsCollection.updateOne(
    filter,
    update,
    { upsert: true }
  );

  // Now fetch the saved document using the same filter
  const savedDoc = await goalsCollection.findOne(filter);

  if (!savedDoc) {
    throw new Error("Failed to fetch goal after upsert");
  }

  // ---- Re-index Pinecone based on the saved doc ----
  if (savedDoc.type === "gym") {
    await indexExerciseGoals(clerkUserId, savedDoc.exerciseGoals || []);
  } else if (savedDoc.type === "baseball") {
    await indexPitchGoals(clerkUserId, savedDoc.pitchGoals || []);
  }

  res.status(201).json({
    success: true,
    goalId: savedDoc._id,
    goal: savedDoc,
  });

  } catch (err) {
    console.error("Error saving goals:", err);
    res.status(500).json({ success: false, error: "Failed to save goals" });
  }
});


module.exports = router;
