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

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.toLowerCase().replace(/\s+/g, "").trim();
}

const PITCH_LABELS = {
  FB: "Fastball (FB)",
  SL: "Slider (SL)",
  CH: "Changeup (CH)",
  CB: "Curveball (CB)",
};
function getPitchKeyFromGoal(goal) {
  if (!goal) return "";

  if (goal.pitchKey) return String(goal.pitchKey).trim();

  const name = (goal.name || "").trim();
  const lower = name.toLowerCase();

  if (lower.includes("fastball")) return "FB";
  if (lower.includes("slider")) return "SL";
  if (lower.includes("changeup")) return "CH";
  if (lower.includes("urve")) return "CB";

  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim();
  }

  return name;
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

function buildPitchHistoryWithGoals(pitchKey, allSessions = [], pitchGoals = []) {
  const goal =
    pitchGoals.find((g) => getPitchKeyFromGoal(g) === pitchKey) || null;
  console.log("GOALLL");
  console.log(goal);
  const goalMaxSpeed = goal ? Number(goal.fastestSpeed ?? 0) : null;
  const goalAccuracy = goal ? Number(goal.accuracy ?? 0) : null;

  const points = [];

  allSessions.forEach((s) => {
    if (!s || s.kind !== "baseball" || !s.pitches) return;

    const sessionDate = s.date ? new Date(s.date) : null;
    if (!sessionDate || Number.isNaN(sessionDate.getTime())) return;

    const pitchData = s.pitches[pitchKey];
    if (!pitchData) return;

    const maxSpeed = Number(pitchData.maxSpeed ?? 0);
    const accuracy = Number(pitchData.accuracy ?? 0);
    const count = Number(pitchData.count ?? 0);

    points.push({
      date: sessionDate,
      maxSpeed,
      accuracy,
      count,
    });
  });

  points.sort((a, b) => a.date - b.date);

  const dataset = points.map((p) => ({
    ...p,
    goalMaxSpeed,
    goalAccuracy,
  }));

  return { dataset, goal };
}

function buildSpeedChartData(dataset, goal, rangeKey) {
    if (!dataset || dataset.length === 0) return null;
  
    const cleaned = dataset.filter((d) => Number(d.maxSpeed) > 0);
  
    if (cleaned.length === 0) return null;
  
    const labels = cleaned.map((d) => formatLabelByRange(d.date, rangeKey));
    const speedData = cleaned.map((d) => d.maxSpeed);
  
    const goalSpeed =
      goal && goal.fastestSpeed != null ? Number(goal.fastestSpeed) : null;
  
    return {
      labels,
      datasets: [
        {
          label: "Max Velocity",
          data: speedData,
          borderWidth: 3,
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.25)",
          fill: "origin",
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
        },
      ],
      goalSpeed,
    };
  }
  
  function buildSpeedChartOptions(goalSpeed) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false, },
        tooltip: { mode: "index", intersect: false },
        annotation: {
          annotations:
            goalSpeed != null
              ? {
                  goalLine: {
                    type: "line",
                    yMin: goalSpeed,
                    yMax: goalSpeed, 
                    borderColor: "rgba(34, 197, 94, 1)",
                    borderWidth: 2,
                    borderDash: [8, 6], 
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
          title: { display: true, text: "Velocity (mph)" },
          beginAtZero: true,
          grid: { color: "rgba(148, 163, 184, 0.3)" },
        },
      },
    };
  }
  function buildAccuracyChartData(dataset, goal, rangeKey) {
    if (!dataset || dataset.length === 0) return null;
  
    const cleaned = dataset.filter((d) => Number(d.accuracy) > 0);
  
    if (cleaned.length === 0) return null;
  
    const labels = cleaned.map((d) => formatLabelByRange(d.date, rangeKey));
    const accuracyData = cleaned.map((d) => d.accuracy);
  
    const goalAccuracy =
      goal && goal.accuracy != null ? Number(goal.accuracy) : null;
  
    return {
      labels,
      datasets: [
        {
          label: "Accuracy (% in zone)",
          data: accuracyData,
          borderWidth: 3,
          borderColor: "rgba(236, 72, 153, 1)",
          backgroundColor: "rgba(236, 72, 153, 0.25)",
          fill: "origin",
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgba(236, 72, 153, 1)",
        },
      ],
      goalAccuracy,
    };
  }
  
  
  

  function buildAccuracyChartOptions(goalAccuracy) {
    return {
      responsive: true,
      plugins: {
        tooltip: {
          enabled: true,
        },
        annotation: {
          annotations:
            goalAccuracy != null
              ? {
                  goalLine: {
                    type: "line",
                    yMin: goalAccuracy,
                    yMax: goalAccuracy, 
                    borderColor: "rgba(251, 191, 36, 1)", 
                    borderWidth: 2,
                    borderDash: [8, 6], 
                    label: {
                      display: false,
                    },
                  },
                }
              : {},
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    };
  }
  
  

export default function PitchingSessionDetailCarousel({
  session,
  allSessions = [],
  pitchGoals = [],
  onBack,
}) {
    console.log(session);
    console.log(allSessions);
    console.log(pitchGoals);
  const pitchEntries = useMemo(() => {
    const pitchesObj = session?.pitches || {};
    return Object.entries(pitchesObj).filter(([_, data]) => data);
  }, [session?.pitches]);

  const [active, setActive] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragStartY, setDragStartY] = useState(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [range, setRange] = useState("month"); 

  const containerRef = useRef(null);

  const pitchSeries = useMemo(
    () =>
      pitchEntries.map(([pitchKey]) =>
        buildPitchHistoryWithGoals(pitchKey, allSessions, pitchGoals)
      ),
    [pitchEntries, allSessions, pitchGoals]
  );

  useEffect(() => {
    setIsFlipped(false);
  }, [session, active]);

  if (!pitchEntries.length) {
    return (
      <div className="session-detail">
        <button className="back-button" onClick={onBack}>
          ← Back to sessions
        </button>
        <p>No pitch data logged for this session.</p>
      </div>
    );
  }

  const dateStr = new Date(session.date).toLocaleDateString();
  const count = pitchEntries.length;

  const clampIndex = (i) => Math.max(0, Math.min(count - 1, i));

  const getClientX = (e) => {
    if (e.touches?.length) return e.touches[0].clientX;
    if (e.changedTouches?.length) return e.changedTouches[0].clientX;
    return e.clientX ?? 0;
  };

  const getClientY = (e) => {
    if (e.touches?.length) return e.touches[0].clientY;
    if (e.changedTouches?.length) return e.changedTouches[0].clientY;
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

      <h3 className="session-detail-title">Pitching Session — {dateStr}</h3>
      <p className="session-detail-subtitle">
        {session.totalPitches || 0} total pitches · ⏱ {session.timeSpent || "N/A"} min
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

        {pitchEntries.map(([pitchKey, data], i) => {
          const rawOffset = i - effectiveActive;
          const absRawOffset = Math.abs(rawOffset);
          console.log(pitchSeries[i])
          const { dataset, goal } = pitchSeries[i] || {
            dataset: [],
            goal: null,
          };

          const filtered = filterDatasetByRange(dataset, range);
          const speedChartData = buildSpeedChartData(filtered, goal, range);
          const accuracyChartData = buildAccuracyChartData(
            filtered,
            goal,
            range
          );

          const isActive = Math.round(effectiveActive) === i;
          const humanLabel = PITCH_LABELS[pitchKey] || pitchKey;

          const videoUrls = Array.isArray(data.videoUrls)
            ? data.videoUrls
            : [];

          return (
            <div
              key={pitchKey}
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
                {/* FRONT: Velocity */}
                <div className="gym-card flip-card-face flip-card-front scrollable-card">
                  <h3>{humanLabel}</h3>

                  <p className="gym-card-meta">
                    <span>Pitches: {data.count ?? "-"}</span>
                    <span>Top Velo: {data.maxSpeed ?? "-"} mph</span>
                    <span>Accuracy: {data.accuracy ?? "-"}%</span>
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

                  {speedChartData && (
                    <div className="exercise-chart large-chart">
                      <Line data={{
                            labels: speedChartData.labels,
                            datasets: speedChartData.datasets,
                        }}
                        options={buildSpeedChartOptions(speedChartData.goalSpeed)} />
                    </div>
                  )}
                </div>

                {/* BACK: Accuracy + videos */}
                <div className="gym-card flip-card-face flip-card-back scrollable-card">
                  <h3>{humanLabel}</h3>

                  <p className="gym-card-meta">
                    <span>Pitches: {data.count ?? "-"}</span>
                    <span>Top Velo: {data.maxSpeed ?? "-"} mph</span>
                    <span>Accuracy: {data.accuracy ?? "-"}%</span>
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

                  {accuracyChartData && (
                    <div className="exercise-chart medium-chart">
                      <Line
                            data={{
                                labels: accuracyChartData.labels,
                                datasets: accuracyChartData.datasets,
                            }}
                            options={buildAccuracyChartOptions(accuracyChartData.goalAccuracy)}
                      />
                    </div>
                  )}

                  {videoUrls.length > 0 && (
                    <div className="exercise-video-list">
                      <h4 className="exercise-video-title">
                        Pitch Videos
                      </h4>
                      <div className="exercise-video-grid">
                        {videoUrls.map((url, idx) => (
                          <video
                            key={idx}
                            className="exercise-video"
                            src={url}
                            controls
                          />
                        ))}
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
        {active + 1} / {pitchEntries.length}
      </div>
    </div>
  );
}
