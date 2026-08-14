// routes/sessionsRoutes.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../db/mongo");
const { getSignedUrlForKey } = require("../db/s3");

const GYM_BUCKET = process.env.AWS_S3_GYM_BUCKET;
const PITCHING_BUCKET = process.env.AWS_S3_PITCHING_BUCKET;

/**
 * Videos are uploaded straight to S3 by the browser via POST /api/uploads/sign,
 * so this route receives only the resulting object keys as JSON. Keys must live
 * under the caller's own prefix -- otherwise a user could attach someone else's
 * video to their session just by guessing a key.
 */
function ownsKey(key, clerkUserId) {
  return typeof key === "string" && key.startsWith(`${clerkUserId}/`);
}

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const sessionsCollection = db.collection("sessions");
    const clerkUserId = req.auth.userId;

    const results = await sessionsCollection
      .find({ userId: clerkUserId })
      .sort({ date: -1 })
      .toArray();

    const sessionsWithSignedUrls = await Promise.all(
      results.map(async (s) => {
        const session = { ...s };

        if (session.kind === "gym" && Array.isArray(session.exercises)) {
          session.exercises = await Promise.all(
            session.exercises.map(async (ex) => {
              const exCopy = { ...ex };

              if (exCopy.videoKey) {
                const signed = await getSignedUrlForKey(GYM_BUCKET, exCopy.videoKey);
                exCopy.video = signed; 
              }

              return exCopy;
            })
          );
        }


        if (session.kind === "baseball" && session.pitches && typeof session.pitches === "object") {
          const pitchesCopy = { ...session.pitches };
          const pitchTypes = Object.keys(pitchesCopy);

          await Promise.all(
            pitchTypes.map(async (pitchType) => {
              const data = pitchesCopy[pitchType] || {};
              const keys = Array.isArray(data.videoKeys) ? data.videoKeys : [];

              const urls = await Promise.all(
                keys.map((key) => getSignedUrlForKey(PITCHING_BUCKET, key))
              );

              pitchesCopy[pitchType] = {
                ...data,
                videoUrls: urls, 
              };
            })
          );

          session.pitches = pitchesCopy;
        }

        return session;
      })
    );

    res.json({ sessions: sessionsWithSignedUrls });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});


router.post("/", async (req, res) => {
  try {
    const db = await getDb();
    const sessions = db.collection("sessions");
    const usersCollection = db.collection("users");

    const clerkUserId = req.auth.userId;

    await usersCollection.updateOne(
      { _id: clerkUserId },
      {
        $setOnInsert: { role: "player", createdAt: new Date() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    const { kind, date, sessionType, timeSpent } = req.body;
    let doc = {
      userId: clerkUserId,
      kind,
      date: date ? new Date(date) : new Date(),
      sessionType,
      timeSpent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };


    if (kind === "gym") {
      const exercises = Array.isArray(req.body.exercises)
        ? req.body.exercises
        : [];

      // Strip any client-supplied key that isn't in this user's own prefix.
      doc.exercises = exercises.map((ex) => {
        const exCopy = { ...ex };
        delete exCopy.video; // transient browser-side File reference

        if (exCopy.videoKey && !ownsKey(exCopy.videoKey, clerkUserId)) {
          delete exCopy.videoKey;
        }

        return exCopy;
      });
    }

    if (kind === "baseball") {
      const pitchData =
        req.body.pitchData && typeof req.body.pitchData === "object"
          ? req.body.pitchData
          : {};

      doc.totalPitches = parseInt(req.body.totalPitches || "0", 10) || 0;
      doc.pitches = {};

      Object.entries(pitchData).forEach(([pitchType, data]) => {
        const keys = Array.isArray(data.videoKeys) ? data.videoKeys : [];

        doc.pitches[pitchType] = {
          count: data.count ?? "",
          accuracy: data.accuracy ?? "",
          maxSpeed: data.maxSpeed ?? "",
          videoKeys: keys.filter((k) => ownsKey(k, clerkUserId)),
        };
      });
    }
    const {
      indexPitchingSession,
      indexGymSession,
    } = require("../services/pineconeIndexer");
    

    const result = await sessions.insertOne(doc);
    
    try {
      const fullDoc = { _id: result.insertedId, ...doc };
      if (kind === "gym") {
        indexGymSession(fullDoc);
      } else if (kind === "baseball") {
        indexPitchingSession(fullDoc);
      }
    } catch (err) {
      console.error("Error indexing session in Pinecone:", err);
    }
    
    res.json({
      success: true,
      sessionId: result.insertedId,
      session: doc,
    });
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

module.exports = router;
