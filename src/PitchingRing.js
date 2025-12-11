// TripleExerciseMaxRing.js (pitching version)
import React, { useEffect, useMemo, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const clampPercent = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const getPitchKeyFromGoal = (goal) => {
  if (!goal) return "";

  if (goal.pitchKey) return String(goal.pitchKey).trim();

  const name = (goal.name || "").trim();
  const lower = name.toLowerCase();

  if (lower.includes("fastball")) return "FB";
  if (lower.includes("slider")) return "SL";
  if (lower.includes("changeup")) return "CH";
  if (lower.includes("curve") || lower.includes("curveball")) return "CB";

  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim();
  }

  return name;
};

export default function TripleExerciseMaxRing({
  exerciseGoals,
  sessions,
  size = 160,
}) {
  const goal = useMemo(
    () => (exerciseGoals && exerciseGoals.length > 0 ? exerciseGoals[0] : null),
    [exerciseGoals]
  );

  const percents = useMemo(() => {
    if (!goal || !Array.isArray(sessions)) return [0, 0];

    const pitchKey = getPitchKeyFromGoal(goal);

    const goalMaxSpeed = Number(goal.fastestSpeed ?? goal.max ?? 0);
    let sessionMaxSpeed = 0;

    if (goalMaxSpeed > 0 && Number.isFinite(goalMaxSpeed)) {
      sessionMaxSpeed =
        sessions.reduce((maxSoFar, session) => {
          if (!session || typeof session !== "object") return maxSoFar;
          const pitches = session.pitches || {};
          const data = pitches[pitchKey];
          if (!data) return maxSoFar;

          const numeric = Number(data.maxSpeed ?? 0);
          if (!Number.isFinite(numeric)) return maxSoFar;

          return Math.max(maxSoFar, numeric);
        }, 0) ?? 0;
    }

    const speedPercent =
      goalMaxSpeed > 0 && sessionMaxSpeed > 0
        ? clampPercent((sessionMaxSpeed / goalMaxSpeed) * 100)
        : 0;

    const goalAccuracy = Number(goal.accuracy ?? 0);

    let totalAcc = 0;
    let accCount = 0;

    if (goalAccuracy > 0 && Number.isFinite(goalAccuracy)) {
      sessions.forEach((session) => {
        if (!session || typeof session !== "object") return;
        const pitches = session.pitches || {};
        const data = pitches[pitchKey];
        if (!data) return;

        const accVal = Number(data.accuracy ?? 0);
        if (Number.isFinite(accVal) && accVal > 0) {
          totalAcc += accVal;
          accCount += 1;
        }
      });
    }

    const actualAccuracy =
      accCount > 0 ? totalAcc / accCount : 0;

    const accuracyPercent =
      goalAccuracy > 0 && actualAccuracy > 0
        ? clampPercent((actualAccuracy / goalAccuracy) * 100)
        : 0;

    return [speedPercent, accuracyPercent];
  }, [goal, sessions]);

  const [displayPercents, setDisplayPercents] = useState(
    percents.map(() => 0)
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

  if (!goal) return null;

  const segmentCount = 2;
  const circleRatio = 1 / segmentCount;

  const trailColors = [
    "rgba(59, 130, 246, 0.25)",
    "rgba(16, 185, 129, 0.25)",
  ];
  const pathColors = [
    "rgb(37, 99, 235)", 
    "rgb(5, 150, 105)", 
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
      {[0, 1].map((idx) => {
        const rotation = idx / segmentCount;
        return (
          <div
            key={idx}
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
        <div>
          <strong>{goal.name || "Pitch"}</strong>
        </div>
        <div>Speed: {Math.round(displayPercents[0] || 0)}%</div>
        <div>Accuracy: {Math.round(displayPercents[1] || 0)}%</div>
      </div>
    </div>
  );
}
