// TripleExerciseMaxRing.js (GYM version)
import React, { useEffect, useMemo, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const clampPercent = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export default function TripleExerciseMaxRing({
  exerciseGoals,
  sessions,
  size = 160,
}) {
  const goals = useMemo(
    () => (exerciseGoals ? exerciseGoals.slice(0, 4) : []),
    [exerciseGoals]
  );

  const metrics = useMemo(() => {
    if (!goals.length || !Array.isArray(sessions)) return [];

    return goals.map((goal) => {
      const rawGoalMax = Number(goal.max ?? 0);
      if (!Number.isFinite(rawGoalMax) || rawGoalMax <= 0) {
        return { percent: 0, sessionMax: 0, goalMax: 0 };
      }

      const goalName = (goal.name || "").trim().toLowerCase();

      const sessionMax =
        sessions.reduce((maxSoFar, session) => {
          if (session.kind !== "gym" || !Array.isArray(session.exercises)) {
            return maxSoFar;
          }

          const bestInSession = session.exercises.reduce((innerMax, ex) => {
            const exName = (ex.name || "").trim().toLowerCase();

            if (goalName && exName !== goalName) return innerMax;

            const numeric = Number(ex.max || ex.maxWeight || 0);
            if (!Number.isFinite(numeric)) return innerMax;
            return Math.max(innerMax, numeric);
          }, 0);

          return Math.max(maxSoFar, bestInSession);
        }, 0) ?? 0;

      if (!sessionMax) {
        return { percent: 0, sessionMax: 0, goalMax: rawGoalMax };
      }

      const rawPercent = (sessionMax / rawGoalMax) * 100;
      const percent = clampPercent(rawPercent);

      return {
        percent,
        sessionMax,
        goalMax: rawGoalMax,
      };
    });
  }, [goals, sessions]);

  const percents = useMemo(
    () => metrics.map((m) => m.percent),
    [metrics]
  );

  const [displayPercents, setDisplayPercents] = useState(
    () => percents.map(() => 0)
  );

  useEffect(() => {
    let cancelled = false;

    const animateMetric = (target, index, duration = 600) =>
      new Promise((resolve) => {
        const start = performance.now();
        target = clampPercent(target);

        const tick = (now) => {
          if (cancelled) return;
          const elapsed = now - start;
          const progress = Math.min(1, elapsed / duration);
          const current = target * progress;

          setDisplayPercents((prev) => {
            const copy = [...prev];
            copy[index] = current;
            return copy;
          });

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(tick);
      });

    (async () => {
      setDisplayPercents(percents.map(() => 0));

      for (let i = 0; i < percents.length; i++) {
        await animateMetric(percents[i], i);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [percents]);

  if (!goals.length) return null;

  const segmentCount = goals.length;
  const circleRatio = 1 / segmentCount;

  const trailColors = [
    "rgba(59, 130, 246, 0.25)",
    "rgba(16, 185, 129, 0.25)",
    "rgba(139, 92, 246, 0.25)",
    "rgba(249, 115, 22, 0.25)",
  ];
  const pathColors = [
    "rgb(37, 99, 235)",
    "rgb(5, 150, 105)",
    "rgb(124, 58, 237)",
    "rgb(234, 88, 12)",
  ];

  return (
    <div
      className="triple-ring-container exercise-max-ring"
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "auto",
      }}
    >
      {goals.map((goal, idx) => {
        const rotation = idx / segmentCount;
        return (
          <div
            key={goal.name || idx}
            style={{
              position: "absolute",
              inset: 0,
            }}
          >
            <CircularProgressbar
              value={displayPercents[idx] || 0}
              circleRatio={circleRatio}
              strokeWidth={8}
              styles={buildStyles({
                rotation,
                trailColor: trailColors[idx] || "rgba(156, 163, 175, 0.25)",
                pathColor: pathColors[idx] || "rgb(75, 85, 99)",
                strokeLinecap: "round",
              })}
            />
          </div>
        );
      })}

      {/* Center labels */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          fontSize: 11,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        {goals.map((goal, idx) => {
          const metric = metrics[idx] || {
            percent: 0,
            sessionMax: 0,
            goalMax: 0,
          };
          const percentDisplay = Math.round(displayPercents[idx] || 0);

          return (
            <div key={goal.name || idx} style={{ marginBottom: 2 }}>
              <div>
                <strong>{goal.name || `Exercise ${idx + 1}`}</strong>
              </div>
              <div>{percentDisplay}% of max</div>
              <div>
                MAX: {metric.sessionMax || 0} / {metric.goalMax || 0}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
