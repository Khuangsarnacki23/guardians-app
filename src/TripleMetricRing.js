// TripleMetricRing.js
import React, { useEffect, useState } from "react";
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const clampPercent = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};
export default function TripleMetricRing({
  minutesPercent,
  setsPercent,
  repsPercent,
  size = 160,
}) {
  const [minutesDisplay, setMinutesDisplay] = useState(0);
  const [setsDisplay, setSetsDisplay] = useState(0);
  const [repsDisplay, setRepsDisplay] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const animateMetric = (target, setter, duration = 600) =>
      new Promise((resolve) => {
        const start = performance.now();
        target = clampPercent(target);

        const tick = (now) => {
          if (cancelled) return;
          const elapsed = now - start;
          const progress = Math.min(1, elapsed / duration);
          setter(target * progress);

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(tick);
      });

    (async () => {
      setMinutesDisplay(0);
      setSetsDisplay(0);
      setRepsDisplay(0);

      await animateMetric(minutesPercent, setMinutesDisplay);
      await animateMetric(setsPercent, setSetsDisplay);
      await animateMetric(repsPercent, setRepsDisplay);
    })();

    return () => {
      cancelled = true;
    };
  }, [minutesPercent, setsPercent, repsPercent]);

  return (
    <div
      className="triple-ring-container"
      style={{
        position: "relative",
        width: size,
        height: size,
        margin:"auto",
      }}
    >
      <div className="triple-ring-layer" style={layerStyle}>
        <CircularProgressbar
          value={minutesDisplay}
          circleRatio={1 / 3}
          strokeWidth={8}
          styles={buildStyles({
            rotation: 0, 
            trailColor: "rgba(248, 113, 113, 0.25)", 
            pathColor: "rgb(220, 38, 38)", 
            strokeLinecap: "round",
          })}
        />
      </div>

      <div className="triple-ring-layer" style={layerStyle}>
        <CircularProgressbar
          value={setsDisplay}
          circleRatio={1 / 3}
          strokeWidth={8}
          styles={buildStyles({
            rotation: 1 / 3, 
            trailColor: "rgba(251, 146, 60, 0.25)",
            pathColor: "rgb(234, 88, 12)", 
            strokeLinecap: "round",
          })}
        />
      </div>

      <div className="triple-ring-layer" style={layerStyle}>
        <CircularProgressbar
          value={repsDisplay}
          circleRatio={1 / 3}
          strokeWidth={8}
          styles={buildStyles({
            rotation: 2 / 3, 
            trailColor: "rgba(250, 204, 21, 0.25)", 
            pathColor: "rgb(202, 138, 4)", 
            strokeLinecap: "round",
          })}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div><strong>Minutes</strong> {Math.round(minutesDisplay)}%</div>
        <div><strong>Sets</strong> {Math.round(setsDisplay)}%</div>
        <div><strong>Reps</strong> {Math.round(repsDisplay)}%</div>
      </div>
    </div>
  );
}

const layerStyle = {
  position: "absolute",
  inset: 0,
};
