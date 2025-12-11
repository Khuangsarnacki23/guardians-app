// services/sessionText.js
const { format } = require("date-fns");

function formatDate(d) {
  if (!d) return "unknown date";
  try {
    return format(d, "yyyy-MM-dd");
  } catch {
    return String(d);
  }
}

function buildPitchingSessionSummary(session) {
  const dateStr = formatDate(session.date);
  const sessionType = session.sessionType || "unspecified type";
  const total = session.totalPitches ?? "";

  const pitchParts = [];
  if (session.pitches && typeof session.pitches === "object") {
    for (const [pitchKey, data] of Object.entries(session.pitches)) {
      if (!data) continue;
      const count = data.count ?? 0;
      const max = data.maxSpeed ?? data.max ?? null;
      const acc = data.accuracy ?? null;

      const pieces = [];
      pieces.push(`${count} ${pitchKey}`);
      if (max != null && max !== "") pieces.push(`max ${max} mph`);
      if (acc != null && acc !== "") pieces.push(`accuracy ${acc}%`);

      pitchParts.push(pieces.join(", "));
    }
  }

  const pitchesSummary = pitchParts.length
    ? pitchParts.join(" · ")
    : "no pitch detail recorded";

  return [
    `Pitching session — ${dateStr}`,
    total ? `Total pitches ${total}` : null,
    pitchesSummary,
    sessionType,
  ]
    .filter(Boolean)
    .join(" — ");
}

function buildGymSessionSummary(session) {
  const dateStr = formatDate(session.date);
  const sessionType = session.sessionType || "unspecified focus";
  const timeSpent = session.timeSpent
    ? `${session.timeSpent} minutes`
    : "time not recorded";

  const exerciseSummaries = [];

  if (Array.isArray(session.exercises)) {
    session.exercises.forEach((ex) => {
      if (!ex || !ex.name) return;
      const name = ex.name;
      const sets = ex.sets ?? "";
      const reps = ex.reps ?? ex.repsPerSet ?? "";
      const max = ex.max ?? ex.maxWeight ?? "";

      let desc = name;
      if (sets || reps) {
        desc += ` ${sets}x${reps}`;
      }
      if (max) {
        desc += `, max ${max}`;
      }
      exerciseSummaries.push(desc);
    });
  }

  const topExercises = exerciseSummaries.slice(0, 4).join(" · ");

  return [
    `Gym session — ${dateStr}`,
    `${sessionType}`,
    timeSpent,
    topExercises || "no exercise detail recorded",
  ]
    .filter(Boolean)
    .join(" — ");
}

function buildPitchGoalSummary(goal) {
  const name = goal.name || "Pitching goal";
  const pitchKey = goal.pitchKey || "";
  const max = goal.fastestSpeed ?? "";
  const acc = goal.accuracy ?? "";

  let parts = [name];
  if (pitchKey) parts.push(`(${pitchKey})`);
  if (max !== "") parts.push(`target velo ${max} mph`);
  if (acc !== "") parts.push(`target accuracy ${acc}%`);

  return parts.join(" — ");
}

function buildExerciseGoalSummary(goal) {
  const name = goal.name || "Strength goal";
  const minutes = goal.minutes ?? "";
  const reps = goal.reps ?? "";
  const max = goal.max ?? "";

  const parts = [name];

  if (max !== "") parts.push(`target max ${max}`);
  if (reps !== "") parts.push(`for ${reps} reps`);
  if (minutes !== "")
    parts.push(`and ${minutes} cumulative minutes of work`);

  return parts.join(" — ");
}

module.exports = {
  buildPitchingSessionSummary,
  buildGymSessionSummary,
  buildPitchGoalSummary,
  buildExerciseGoalSummary,
};
