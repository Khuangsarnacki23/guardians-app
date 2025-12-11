// services/pineconeIndexer.js
const { getPineconeIndex } = require("../db/pinecone");
const { embedText } = require("../db/openai");
const {
  buildPitchingSessionSummary,
  buildGymSessionSummary,
  buildPitchGoalSummary,
  buildExerciseGoalSummary,
} = require("./sessionText");

async function safeEmbed(text) {
  try {
    return await embedText(text);
  } catch (err) {
    console.error("Skipping embedding due to error:", err?.message || err);
    return null;
  }
}

async function indexPitchingSession(session) {
  const index = getPineconeIndex();
  const userId = session.userId;
  const namespace = userId;
  console.log(session)
  const id = `pitch_session:${session._id.toString()}`;
  const text = buildPitchingSessionSummary(session);
  const vector = await safeEmbed(text);
  if (!vector) return; 
  await index.namespace(namespace).upsert([
    {
      id,
      values: vector,
      metadata: {
        type: "session",
        kind: "baseball",
        userId,
        date: session.date ? session.date.toISOString() : null,
        sessionType: session.sessionType || null,
        totalPitches: session.totalPitches ?? null,
        summary: text,
      },
    },
  ]);
}

async function indexGymSession(session) {
  const index = getPineconeIndex();
  const userId = session.userId;
  const namespace = userId;

  const id = `gym_session:${session._id.toString()}`;
  const text = buildGymSessionSummary(session);

  const vector = await safeEmbed(text);
  if (!vector) return;

  await index.namespace(namespace).upsert([
    {
      id,
      values: vector,
      metadata: {
        type: "session",
        kind: "gym",
        userId,
        date: session.date ? session.date.toISOString() : null,
        sessionType: session.sessionType || null,
        timeSpent: session.timeSpent ?? null,
        summary: text,
      },
    },
  ]);
}

async function indexPitchGoals(userId, pitchGoals = []) {
  if (!pitchGoals.length) return;

  const index = getPineconeIndex();
  const namespace = userId;

  const vectors = [];
  for (const goal of pitchGoals) {
    const id = `pitch_goal:${goal._id || goal.pitchKey || goal.name}`;
    const text = buildPitchGoalSummary(goal);

    const vector = await safeEmbed(text);
    if (!vector) continue;

    vectors.push({
      id,
      values: vector,
      metadata: {
        type: "goal",
        kind: "baseball",
        userId,
        pitchKey: goal.pitchKey || null,
        fastestSpeed: goal.fastestSpeed ?? null,
        accuracy: goal.accuracy ?? null,
        name: goal.name || null,
        summary: text,
      },
    });
  }

  if (vectors.length) {
    await index.namespace(namespace).upsert(vectors);
  }
}

async function indexExerciseGoals(userId, exerciseGoals = []) {
  if (!exerciseGoals.length) return;

  const index = getPineconeIndex();
  const namespace = userId;

  const vectors = [];
  for (const goal of exerciseGoals) {
    const id = `exercise_goal:${goal._id || goal.name}`;
    const text = buildExerciseGoalSummary(goal);

    const vector = await safeEmbed(text);
    if (!vector) continue;

    vectors.push({
      id,
      values: vector,
      metadata: {
        type: "goal",
        kind: "gym",
        userId,
        name: goal.name || null,
        minutes: goal.minutes ?? null,
        reps: goal.reps ?? null,
        max: goal.max ?? null,
        summary: text,
      },
    });
  }

  if (vectors.length) {
    await index.namespace(namespace).upsert(vectors);
  }
}

function chunkText(text, maxLen = 800) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      let end = start + maxLen;
      if (end > text.length) end = text.length;
  
      let sliceEnd = end;
      const window = text.slice(start, end);
      const lastBreak =
        window.lastIndexOf("\n") !== -1
          ? window.lastIndexOf("\n")
          : window.lastIndexOf(". ");
  
      if (lastBreak > maxLen * 0.6) {
        sliceEnd = start + lastBreak + 1;
      }
  
      const chunk = text.slice(start, sliceEnd).trim();
      if (chunk) chunks.push(chunk);
  
      start = sliceEnd;
    }
    return chunks;
  }
  
  async function indexCoachDocChunks(doc, rawText) {
    const index = getPineconeIndex();
    const userId = doc.userId;
    const namespace = userId;
  
    const chunks = chunkText(rawText, 900);
  
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk); 
  
      vectors.push({
        id: `coach_doc:${doc._id}:${i}`,
        values: embedding,
        metadata: {
          type: "coach_doc",
          userId,
          docId: doc._id.toString(),
          title: doc.title || doc.originalFilename,
          chunkIndex: i,
          summary: chunk,
        },
      });
    }
  
    if (vectors.length) {
      await index.namespace(namespace).upsert(vectors);
    }
  }

  
module.exports = {
  indexPitchingSession,
  indexGymSession,
  indexPitchGoals,
  indexExerciseGoals,
  indexCoachDocChunks,
};
