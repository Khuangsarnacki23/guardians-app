// GymSessionDetailCarousel.js
import React, { useMemo, useRef, useState, useEffect } from "react";
import "./GymSessions.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  annotationPlugin
);

const MAX_VISIBILITY = 3;
const SWIPE_CARD_THRESHOLD = 0.2;

/* ---------- Name helpers ---------- */
function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.toLowerCase().replace(/\s+/g, "").trim();
}

function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/* ---------- Date helpers ---------- */
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatLabelByRange(date, rangeKey) {
  if (!(date instanceof Date)) return "";

  switch (rangeKey) {
    case "week":
      return date.toLocaleDateString(undefined, { weekday: "short" });
    case "month":
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    case "year":
      return date.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
    case "all":
    default:
      return date.toLocaleDateString(undefined, { year: "numeric" });
  }
}

function filterDatasetByRange(dataset, rangeKey) {
  if (!dataset || dataset.length === 0) return [];
  if (rangeKey === "all") return dataset;

  const now = new Date();
  let from = null;

  switch (rangeKey) {
    case "week":
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      break;
    case "month":
      from = new Date(now);
      from.setMonth(now.getMonth() - 1);
      break;
    case "year":
      from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return dataset;
  }

  return dataset.filter((d) => d.date >= from);
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const parseGoalDate = (g) => {
  if (!g) return null;
  const d = g.targetDate ? new Date(g.targetDate) : null;
  return isValidDate(d) ? d : null;
};

/**
 * For one exercise name, find:
 * - lifetime goals (use latest by createdAt)
 * - dated goals (collect all markers with targetDate)
 */
function pickClosestFutureDatedGoalDoc(goalDocs, now = new Date()) {
  const dated = goalDocs
    .filter((g) => g?.scope === "dated" && g?.targetDate)
    .map((g) => ({ ...g, _target: new Date(g.targetDate) }))
    .filter((g) => isValidDate(g._target) && g._target > now)
    .sort((a, b) => a._target - b._target);

  return dated[0] || null; // closest future
}

function pickLatestLifetimeGoalDoc(goalDocs) {
  const lifetime = goalDocs
    .filter((g) => g?.scope === "lifetime")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return lifetime[0] || null;
}

function pickExerciseGoalFromDoc(goalDoc, exerciseName) {
  const list = Array.isArray(goalDoc?.exerciseGoals) ? goalDoc.exerciseGoals : [];
  return list.find((eg) => namesMatch(eg?.name, exerciseName)) || null;
}

/**
 * Returns the single threshold values for this exercise:
 * - Prefer closest FUTURE dated goal
 * - Else latest lifetime goal
 */
function getThresholdForExercise(goalsDocs, exerciseName) {
  if (!Array.isArray(goalsDocs)) {
    return { goalMax: null, goalMinutes: null };
  }

  const gymDocs = goalsDocs.filter((g) => g?.type === "gym");
  const now = new Date();

  const closestFutureDatedDoc = pickClosestFutureDatedGoalDoc(gymDocs, now);
  const lifetimeDoc = pickLatestLifetimeGoalDoc(gymDocs);

  // try dated first
  const datedExerciseGoal = closestFutureDatedDoc
    ? pickExerciseGoalFromDoc(closestFutureDatedDoc, exerciseName)
    : null;

  if (datedExerciseGoal) {
    return {
      goalMax: datedExerciseGoal.max != null ? toNum(datedExerciseGoal.max) : null,
      goalMinutes:
        datedExerciseGoal.minutes != null ? toNum(datedExerciseGoal.minutes) : null,
    };
  }

  // fallback lifetime
  const lifetimeExerciseGoal = lifetimeDoc
    ? pickExerciseGoalFromDoc(lifetimeDoc, exerciseName)
    : null;

  return {
    goalMax: lifetimeExerciseGoal?.max != null ? toNum(lifetimeExerciseGoal.max) : null,
    goalMinutes:
      lifetimeExerciseGoal?.minutes != null ? toNum(lifetimeExerciseGoal.minutes) : null,
  };
}

function splitExerciseGoals(goalsDocs, exerciseName) {
  if (!Array.isArray(goalsDocs)) {
    return {
      lifetime: { max: null, minutes: null },
      dated: [], // [{ date: Date, max: number|null, minutes: number|null }]
    };
  }

  const gymGoals = goalsDocs.filter((g) => g?.type === "gym");

  const lifetimeDocs = gymGoals
    .filter((g) => g?.scope === "lifetime")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const datedDocs = gymGoals.filter(
    (g) => g?.scope === "dated" && g?.targetDate
  );

  const pickExerciseGoal = (goalDoc) => {
    const list = Array.isArray(goalDoc?.exerciseGoals) ? goalDoc.exerciseGoals : [];
    return list.find((eg) => namesMatch(eg?.name, exerciseName)) || null;
  };

  // latest lifetime exercise goal
  const lifetimeDoc = lifetimeDocs[0] || null;
  const lifetimeExerciseGoal = lifetimeDoc ? pickExerciseGoal(lifetimeDoc) : null;

  const lifetime = {
    max: lifetimeExerciseGoal ? toNum(lifetimeExerciseGoal.max) : null,
    minutes: lifetimeExerciseGoal ? toNum(lifetimeExerciseGoal.minutes) : null,
  };

  // dated markers
  const dated = datedDocs
    .map((doc) => {
      const d = parseGoalDate(doc);
      if (!d) return null;

      const eg = pickExerciseGoal(doc);
      if (!eg) return null;

      return {
        date: d,
        max: eg.max != null ? toNum(eg.max) : null,
        minutes: eg.minutes != null ? toNum(eg.minutes) : null,
      };
    })
    .filter(Boolean);

  return { lifetime, dated };
}


/* ---------- History builder (sessions only) ---------- */
function buildExerciseHistory(exerciseName, allSessions = []) {
  const points = [];

  allSessions.forEach((s) => {
    if (!s || !s.exercises) return;

    const sessionDate = s.date ? new Date(s.date) : null;
    if (!sessionDate || Number.isNaN(sessionDate.getTime())) return;

    s.exercises.forEach((ex) => {
      if (!ex || !ex.name) return;
      if (!namesMatch(exerciseName, ex.name)) return;

      const maxVal = Number(ex.maxWeight ?? ex.max ?? 0);
      const repsVal = Number(ex.reps ?? ex.repsPerSet ?? 0);
      const minutesVal = Number(s.timeSpent ?? 0);

      points.push({
        date: sessionDate,
        max: maxVal,
        reps: repsVal,
        minutes: minutesVal,
      });
    });
  });

  points.sort((a, b) => a.date - b.date);

  let cumMinutes = 0;
  const dataset = points.map((p) => {
    cumMinutes += p.minutes || 0;
    return {
      ...p,
      cumMinutes,
    };
  });

  return dataset;
}
function filterGoalsByRange(goals = [], rangeKey) {
  if (!goals.length || rangeKey === "all") return goals;

  const now = new Date();
  let from = null;

  switch (rangeKey) {
    case "week":
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      break;
    case "month":
      from = new Date(now);
      from.setMonth(now.getMonth() - 1);
      break;
    case "year":
      from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return goals;
  }

  return goals.filter((g) => g.date >= from);
}

/* ---------- Goal extraction per exercise ---------- */
function getExerciseGoalInfoForExercise(exerciseName, allGoals = []) {
  if (!Array.isArray(allGoals)) {
    return { lifetimeMax: null, lifetimeMinutes: null, datedGoals: [] };
  }

  const gymGoals = allGoals.filter((g) => g.type === "gym");
  const lifetimeDocs = gymGoals.filter((g) => g.scope === "lifetime");
  const datedDocs = gymGoals.filter(
    (g) => g.scope === "dated" && g.targetDate
  );
  console.log(datedDocs);
  // Latest lifetime doc that actually has this exercise
  let lifetimeMax = null;
  let lifetimeMinutes = null;

  if (lifetimeDocs.length) {
    const sorted = [...lifetimeDocs].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    for (const doc of sorted) {
      const exGoal =
        Array.isArray(doc.exerciseGoals) &&
        doc.exerciseGoals.find((eg) => namesMatch(eg.name, exerciseName));

      if (exGoal) {
        lifetimeMax = exGoal.max != null ? toNum(exGoal.max) : null;
        lifetimeMinutes =
          exGoal.minutes != null ? toNum(exGoal.minutes) : null;
        break;
      }
    }
  }

  // Dated markers (stars) for this exercise
  const datedGoals = [];
  console.log(datedDocs);
  datedDocs.forEach((doc) => {
    if (!doc.targetDate) return;

    const exGoal =
      Array.isArray(doc.exerciseGoals) &&
      doc.exerciseGoals.find((eg) => namesMatch(eg.name, exerciseName));

    if (!exGoal) return;

    datedGoals.push({
      date: new Date(doc.targetDate),
      max: exGoal.max != null ? toNum(exGoal.max) : null,
      minutes: exGoal.minutes != null ? toNum(exGoal.minutes) : null,
    });
  });
  console.log(datedGoals);
  return { lifetimeMax, lifetimeMinutes, datedGoals };
}

function buildMaxChartOptions(goalMax) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        mode: "nearest",
        intersect: true,
        callbacks: {
          label(context) {
            const value = context.parsed.y;
            const reps =
              context.dataset.repsMeta?.[context.dataIndex];

            let label = `Max: ${value}`;

            if (reps != null && reps !== 0) {
              label += ` (${reps} reps)`;
            }

            return label;
          },
        },
      },
      annotation: {
        annotations:
          goalMax != null
            ? {
                goalLine: {
                  type: "line",
                  yMin: goalMax,
                  yMax: goalMax,
                  borderColor: "rgba(34, 197, 94, 1)",
                  borderWidth: 2,
                  borderDash: [6, 4],
                },
              }
            : {},
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Date" },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "Max Weight" },
        beginAtZero: true,
        grid: { color: "rgba(148, 163, 184, 0.3)" },
      },
    },
  };
}


function buildMinutesChartOptions(goalMinutes) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
      annotation: {
        annotations:
          goalMinutes != null
            ? {
                goalLine: {
                  type: "line",
                  yMin: goalMinutes,
                  yMax: goalMinutes,
                  borderColor: "rgba(251, 191, 36, 1)",
                  borderWidth: 2,
                  borderDash: [6, 4],
                  label: {
                    display: false,
                  },
                },
              }
            : {},
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Date" },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "Cumulative Minutes" },
        beginAtZero: true,
        grid: { color: "rgba(148, 163, 184, 0.3)" },
      },
    },
  };
}
function buildMaxRepsChartData(dataset, goalsDocs, exerciseName, rangeKey) {
  if (!dataset || dataset.length === 0) return null;

  const labels = dataset.map((d) => formatLabelByRange(d.date, rangeKey));
  const maxData = dataset.map((d) => d.max ?? 0);
  const repsData = dataset.map((d) => d.reps ?? 0);

  const { goalMax } = getThresholdForExercise(goalsDocs, exerciseName);

  return {
    labels,
    datasets: [
      {
        label: "Max Weight",
        data: maxData,
        // attach reps as hidden metadata
        repsMeta: repsData,

        borderWidth: 3,
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: "origin",
        tension: 0.35,

        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
      },
    ],
    goalMax,
  };
}



function buildMinutesChartData(dataset, goalsDocs, exerciseName, rangeKey) {
  if (!dataset || dataset.length === 0) return null;

  const labels = dataset.map((d) => formatLabelByRange(d.date, rangeKey));
  const cumMinutes = dataset.map((d) => d.cumMinutes ?? 0);

  const { goalMinutes } = getThresholdForExercise(goalsDocs, exerciseName);

  return {
    labels,
    datasets: [
      {
        label: "Cumulative Minutes",
        data: cumMinutes,
        borderWidth: 3,
        borderColor: "rgba(56, 189, 248, 1)",
        backgroundColor: "rgba(56, 189, 248, 0.2)",
        fill: "origin",
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(56, 189, 248, 1)",
      },
    ],
    goalMinutes,
  };
}




/* ---------- Component ---------- */
export default function GymSessionDetailCarousel({
  session,
  allSessions = [],
  goals,
  onBack,
}) {
  const exercises = useMemo(
    () => session?.exercises || [],
    [session?.exercises]
  );

  const [active, setActive] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [range, setRange] = useState("month");

  const containerRef = useRef(null);
  const [dragStartY, setDragStartY] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Build per-exercise history from sessions
  const exerciseSeries = useMemo(
    () =>
      exercises.map((ex) =>
        buildExerciseHistory(ex.name, allSessions)
      ),
    [exercises, allSessions]
  );

  useEffect(() => {
    setIsFlipped(false);
  }, [session, active]);

  if (!exercises.length) {
    return (
      <div className="session-detail">
        <button className="back-button" onClick={onBack}>
          ← Back to sessions
        </button>
        <p>No exercises logged for this session.</p>
      </div>
    );
  }

  const dateStr = new Date(session.date).toLocaleDateString();
  const count = exercises.length;

  const clampIndex = (i) => Math.max(0, Math.min(count - 1, i));

  const getClientX = (e) => {
    if (e.touches && e.touches.length) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length)
      return e.changedTouches[0].clientX;
    return e.clientX ?? 0;
  };

  const getClientY = (e) => {
    if (e.touches && e.touches.length) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches.length)
      return e.changedTouches[0].clientY;
    return e.clientY ?? 0;
  };

  const handlePointerDown = (e) => {
    const x = getClientX(e);
    const y = getClientY(e);
    setDragStartX(x);
    setDragStartY(y);
    setIsDragging(true);
    setDragDelta(0);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || dragStartX == null || !containerRef.current) return;

    const x = getClientX(e);
    const dx = x - dragStartX;
    const width = containerRef.current.offsetWidth || 1;
    const delta = dx / width;

    setDragDelta(delta);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;

    const x = getClientX(e);
    const y = getClientY(e);

    const dx = x - (dragStartX ?? x);
    const dy = y - (dragStartY ?? y);

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const VERTICAL_THRESHOLD = 40;
    const HORIZONTAL_THRESHOLD = SWIPE_CARD_THRESHOLD;

    if (absDy > absDx && absDy > VERTICAL_THRESHOLD) {
      setIsFlipped((prev) => !prev);
    } else {
      const finalDelta = dragDelta;

      if (finalDelta <= -HORIZONTAL_THRESHOLD) {
        setActive((prev) => clampIndex(prev - 1));
      } else if (finalDelta >= HORIZONTAL_THRESHOLD) {
        setActive((prev) => clampIndex(prev + 1));
      }
    }

    setDragStartX(null);
    setDragStartY(null);
    setDragDelta(0);
    setIsDragging(false);
  };

  const goPrev = () => {
    setActive((prev) => clampIndex(prev - 1));
    setDragDelta(0);
  };

  const goNext = () => {
    setActive((prev) => clampIndex(prev + 1));
    setDragDelta(0);
  };

  const effectiveActive = active + dragDelta;

  return (
    <div className="session-detail">
      <button className="back-button" onClick={onBack}>
        ← Back to sessions
      </button>

      <h3 className="session-detail-title">Gym Session — {dateStr}</h3>
      <p className="session-detail-subtitle">
        {exercises.length} exercises · ⏱ {session.timeSpent || "N/A"} min
      </p>

      <div
        ref={containerRef}
        className="gym-carousel"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {exercises.map((ex, i) => {
          const rawOffset = i - effectiveActive;
          const absRawOffset = Math.abs(rawOffset);

          const dataset = exerciseSeries[i] || [];
          const goalInfo = getExerciseGoalInfoForExercise(
            ex.name,
            goals ?? []
          );

          const filtered = filterDatasetByRange(dataset, range);
          const maxChartData = buildMaxRepsChartData(filtered, goals, ex.name, range);
          const minutesChartData = buildMinutesChartData(filtered, goals, ex.name, range);

          const isActive = Math.round(effectiveActive) === i;
          const videoForBack = ex.video ?? "";

          return (
            <div
              key={i}
              className="gym-card-container"
              style={{
                "--active": Math.abs(rawOffset) < 0.5 ? 1 : 0,
                "--offset": rawOffset / 3,
                "--direction": Math.sign(rawOffset) || 0,
                "--abs-offset": absRawOffset / 3,
                pointerEvents: isActive ? "auto" : "none",
                opacity: absRawOffset > MAX_VISIBILITY ? 0 : 1,
                display: absRawOffset > MAX_VISIBILITY ? "none" : "block",
                transition: isDragging
                  ? "none"
                  : "transform 0.3s ease-out, filter 0.3s ease-out, opacity 0.3s ease-out",
              }}
            >
              <div
                className={`flip-card-inner ${
                  isFlipped && isActive ? "flipped" : ""
                }`}
              >
                {/* FRONT: Max + Reps */}
                <div className="gym-card flip-card-face flip-card-front scrollable-card">
                  <h3>{ex.name || `Exercise ${i + 1}`}</h3>

                  <p className="gym-card-meta">
                    <span>Sets: {ex.sets ?? "-"}</span>
                    <span>Reps: {ex.reps ?? ex.repsPerSet ?? "-"}</span>
                    <span>Max: {ex.max ?? ex.maxWeight ?? "-"}</span>
                  </p>

                  <div className="chart-range-toggle">
                    {[
                      { key: "week", label: "Last Week" },
                      { key: "month", label: "Last Month" },
                      { key: "year", label: "Last Year" },
                      { key: "all", label: "All Time" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`range-btn ${
                          range === opt.key ? "range-btn-active" : ""
                        }`}
                        onClick={() => setRange(opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {maxChartData && (
                    <div className="exercise-chart large-chart" >
                      <Line
                        data={{
                          labels: maxChartData.labels,
                          datasets: maxChartData.datasets,
                        }}
                        options={buildMaxChartOptions(maxChartData.goalMax)}
                      />
                    </div>
                  )}
                </div>

                {/* BACK: Minutes + video */}
                <div className="gym-card flip-card-face flip-card-back scrollable-card">
                  <h3>{ex.name || `Exercise ${i + 1}`}</h3>

                  <p className="gym-card-meta">
                    <span>Sets: {ex.sets ?? "-"}</span>
                    <span>Reps: {ex.reps ?? ex.repsPerSet ?? "-"}</span>
                    <span>Max: {ex.max ?? ex.maxWeight ?? "-"}</span>
                  </p>

                  <div className="chart-range-toggle">
                    {[
                      { key: "week", label: "Last Week" },
                      { key: "month", label: "Last Month" },
                      { key: "year", label: "Last Year" },
                      { key: "all", label: "All Time" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`range-btn ${
                          range === opt.key ? "range-btn-active" : ""
                        }`}
                        onClick={() => setRange(opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {minutesChartData && (
                    <div className="exercise-chart medium-chart" style = {{height:"160.9px"}}>
                      <Line
                        data={{
                          labels: minutesChartData.labels,
                          datasets: minutesChartData.datasets,
                        }}
                        options={buildMinutesChartOptions(
                          minutesChartData.goalMinutes
                        )}
                      />
                    </div>
                  )}

                  {videoForBack.length > 0 && (
                    <div className="exercise-video-list">
                      <h4 className="exercise-video-title">
                        Exercise Video
                      </h4>
                      <div className="exercise-video-grid">
                        <video
                          className="exercise-video"
                          src={videoForBack}
                          controls
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}


      </div>

      <div className="carousel-indicator">
        {active + 1} / {exercises.length}
      </div>
    </div>
  );
}
