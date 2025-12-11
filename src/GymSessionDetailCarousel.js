// GymSessionDetailCarousel.jsx
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

/* ---------- Helper functions (defined FIRST) ---------- */

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.toLowerCase().replace(/\s+/g, "").trim();
}


// Fuzzy match: "Rows" vs "Back Rows" etc.
function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
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

const maxChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
    tooltip: { mode: "index", intersect: false },
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

const minutesChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
    tooltip: { mode: "index", intersect: false },
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

/**
 * Build time-series data for a single exercise across ALL sessions,
 * and attach goal info from goals.exerciseGoals.
 */
function buildExerciseHistoryWithGoals(
  exerciseName,
  allSessions = [],
  exerciseGoals = []
) {
  console.log(exerciseGoals);
  console.log(exerciseName);
  const goal =
    exerciseGoals.find((g) => namesMatch(exerciseName, g.name)) || null;
  console.log(goal);
  const maxGoal = goal ? Number(goal.max ?? 0) : null;
  const minutesGoal = goal ? Number(goal.minutes ?? 0) : null;

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
      goalMax: maxGoal,
      goalMinutes: minutesGoal,
    };
  });

  return { dataset, goal };
}
function buildMaxChartOptions(goalMax) {

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
      annotation: {
        annotations:
          goalMax != null
            ? {
                goalLine: {
                  type: "line",
                  yMin: goalMax,
                  yMax: goalMax, // horizontal line at goalMax
                  borderColor: "rgba(34, 197, 94, 1)", // green
                  borderWidth: 2,
                  borderDash: [6, 4], // dashed line
                  label: {
                    display: false, // 👈 no text label, just the line
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
                  yMax: goalMinutes, // horizontal line at cumulative minutes goal
                  borderColor: "rgba(251, 191, 36, 1)", // yellow/gold
                  borderWidth: 2,
                  borderDash: [6, 4],
                  label: {
                    display: false, // 👈 no text
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

function buildMaxRepsChartData(dataset, goal, rangeKey) {
  if (!dataset || dataset.length === 0) {
    return null;
  }

  const labels = dataset.map((d) => formatLabelByRange(d.date, rangeKey));
  const maxData = dataset.map((d) => d.max ?? 0);
  const repsData = dataset.map((d) => d.reps ?? 0);

  const goalMax = goal && goal.max != null ? Number(goal.max) : null;

  return {
    labels,
    datasets: [
      {
        label: "Max Weight",
        data: maxData,
        borderWidth: 3,
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: "origin",
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
      },
      {
        label: "Reps @ Max",
        data: repsData,
        borderWidth: 2,
        borderColor: "rgba(236, 72, 153, 0.7)",
        backgroundColor: "rgba(236, 72, 153, 0.15)",
        fill: "origin",
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "rgba(236, 72, 153, 1)",
      },
    ],
    goalMax, // 👈 used for annotation
  };
}


function buildMinutesChartData(dataset, goal, rangeKey) {
  if (!dataset || dataset.length === 0) {
    return null;
  }

  const labels = dataset.map((d) => formatLabelByRange(d.date, rangeKey));
  const cumMinutes = dataset.map((d) => d.cumMinutes ?? 0);

  const goalMinutes =
    goal && goal.minutes != null ? Number(goal.minutes) : null;

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
    goalMinutes, // 👈 used for annotation
  };
}


/* --------------------------- Main component --------------------------- */

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
  const [range, setRange] = useState("month"); // "week" | "month" | "year" | "all"

  const containerRef = useRef(null);

  const [dragStartY, setDragStartY] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  console.log(goals);
  const exerciseSeries = useMemo(
    () =>
      exercises.map((ex) =>
        buildExerciseHistoryWithGoals(
          ex.name,
          allSessions,
          goals?? []
        )
      ),
    [exercises, allSessions, goals]
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

    const VERTICAL_THRESHOLD = 40; // px
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
        {active > 0 && !isDragging && (
          <button
            type="button"
            className="gym-nav gym-nav-left"
            onClick={goPrev}
          >
            ‹
          </button>
        )}

        {exercises.map((ex, i) => {
          const rawOffset = i - effectiveActive;
          const absRawOffset = Math.abs(rawOffset);
          console.log(ex);
          const { dataset, goal } = exerciseSeries[i] || {
            dataset: [],
            goal: null,
          };
          console.log(goal);
          const filtered = filterDatasetByRange(dataset, range);
          const maxChartData = buildMaxRepsChartData(filtered, goal, range);
          const minutesChartData = buildMinutesChartData(
            filtered,
            goal,
            range
          );

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
              {/* Entire card flips: each face is a full gym-card */}
              <div
                className={`flip-card-inner ${
                  isFlipped && isActive ? "flipped" : ""
                }`}
              >
                {/* FRONT */}
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
                    <div className="exercise-chart large-chart">
                      <Line data={{
                          labels: maxChartData.labels,
                          datasets: maxChartData.datasets,
                        }}
                        options={buildMaxChartOptions(maxChartData.goalMax)}/>
                    </div>
                  )}
                </div>

                {/* BACK */}
                <div className="gym-card flip-card-face flip-card-back scrollable-card">
                  <h3>{ex.name || `Exercise ${i + 1}`} </h3>

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
                    <div className="exercise-chart medium-chart">
                      <Line
                              data={{
                                labels: minutesChartData.labels,
                                datasets: minutesChartData.datasets,
                              }}
                              options={buildMinutesChartOptions(minutesChartData.goalMinutes)}
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

        {active < count - 1 && !isDragging && (
          <button
            type="button"
            className="gym-nav gym-nav-right"
            onClick={goNext}
          >
            ›
          </button>
        )}
      </div>

      <div className="carousel-indicator">
        {active + 1} / {exercises.length}
      </div>
    </div>
  );
}
