// PitchingDashboard.js
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import Menu from "./Menu";
import TripleExerciseMaxRing from "./TripleExerciseMaxRing";
import TripleMetricRing from "./TripleMetricRing";
import PitchingRing from "./PitchingRing.js";
import MyDatePicker from "./MyDatePicker";
import { toast } from 'react-toastify';
import FullScreenLayout from "./FullScreenLayout";
import PitchingSessionDetailCarousel from "./PitchingSessionDetailCarousel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faFileVideo } from "@fortawesome/free-solid-svg-icons";
function PitchingDashboard({ sessions, uploadSessionToApi, apiBaseUrl, setOverlayVisible }) {
  const { getToken } = useAuth();
  const [activeRingIndex, setActiveRingIndex] = useState(0)
  const [goals, setGoals] = useState([]);

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  const [totalMinutesTarget, setTotalMinutesTarget] = useState("");
  const [totalRepsTarget, setTotalRepsTarget] = useState("");
  const [totalAccuracyTarget, setTotalAccuracyTarget] = useState("");
  const [ringVersion, setRingVersion] = useState(0); 
  const [selectedSession, setSelectedSession] = useState(null);
  const [pitchGoals, setPitchGoals] = useState([]);
  const PITCH_TYPES = [
    { key: "FB", label: "Fastball (FB)" },
    { key: "SL", label: "Slider (SL)" },
    { key: "CH", label: "Changeup (CH)"},
    { key: "CB", label: "Curveball (CB)" },
  ];
  
  const [pitchData, setPitchData] = useState({
    FB: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
    SL: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
    CH: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
    CB: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
  });
  
  const [sessionDay, setSessionDay] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSessionDay, setTempSessionDay] = useState(null);
  const [timeSpent, setTimeSpent] = useState("");
  const [pitchCounts, setPitchCounts] = useState({
    FB: "",
    SL: "",
    CH: "",
    CB: "",
  });
  const [pitchVideos, setPitchVideos] = useState({
    FB: [],
    SL: [],
    CH: [],
    CB: [],
  });


  const handlePitchFieldChange = (typeKey, field, value) => {
    setPitchData(prev => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        [field]: value,
      },
    }));
  };
  
  const handlePitchVideosChange = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    setPitchData(prev => {
      const pitch = prev[key] || {};
      const existing = pitch.videos || [];
  

      if (existing.length >= 1) {
        return prev;
      }
  
      return {
        ...prev,
        [key]: {
          ...pitch,
          videos: [file],
        },
      };
    });
  };
  
  
  
  
  const baseballSessions = useMemo(
    () => (Array.isArray(sessions) ? sessions.filter((s) => s.kind === "baseball") : []),
    [sessions]
  );
  const togglePitchExpanded = (typeKey) => {
    setPitchData(prev => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        expanded: !prev[typeKey].expanded,
      },
    }));
  };

  
  const handlePitchGoalChange = (index, field, value) => {
    setPitchGoals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
const totalRepsGoal = Array.isArray(goals)
? goals
    .filter((g) => g.type === "baseball")
    .reduce((sum, g) => sum + toNum(g.totals?.reps), 0)
: 0;

const actualTotalReps = sessions
.filter((s) => s.kind === "baseball")
.reduce((sum, s) => {
  const pitches = s.pitches || {};
  const sessionReps = Object.values(pitches).reduce(
    (inner, p) => inner + toNum(p.count),
    0
  );
  return sum + sessionReps;
}, 0);

const totalRepsPercent =
totalRepsGoal > 0
  ? Math.min(100, (actualTotalReps / totalRepsGoal) * 100)
  : 0;

const baseballGoals = Array.isArray(goals)
? goals.filter((g) => g.type === "baseball")
: [];

const goalAccuracy =
baseballGoals.length > 0
  ? baseballGoals.reduce(
      (sum, g) => sum + toNum(g.totals?.accuracy),
      0
    ) / baseballGoals.length
  : 0;

const accuracyAgg = sessions
.filter((s) => s.kind === "baseball")
.reduce(
  (acc, s) => {
    const pitches = s.pitches || {};

    Object.values(pitches).forEach((p) => {
      const count = toNum(p.count);
      const accVal = toNum(p.accuracy);
      if (count > 0) {
        acc.weightedAccSum += accVal * count;
        acc.totalPitches += count;
      }
    });

    return acc;
  },
  { weightedAccSum: 0, totalPitches: 0 }
);

const actualAccuracy =
accuracyAgg.totalPitches > 0
  ? accuracyAgg.weightedAccSum / accuracyAgg.totalPitches
  : 0;

const totalAccuracyPercent =
goalAccuracy > 0
  ? Math.min(100, (actualAccuracy / goalAccuracy) * 100)
  : 0;

  const totalMinutesGoal = Array.isArray(goals)
  ? goals
      .filter((g) => g.type === "baseball")
      .reduce(
        (sum, g) => sum + toNum(g.totals?.minutes),
        0
      )
  : 0;

  const actualTotalMinutes = sessions.reduce((sum, s) => {
    if (s.kind !== "baseball") return sum;
    return sum + toNum(s.timeSpent);
  }, 0);

  const totalMinutesPercent =
  totalMinutesGoal > 0
    ? Math.min(100, (actualTotalMinutes / totalMinutesGoal) * 100)
    : 0;

   const pitchingExerciseGoals = useMemo(() => {
        if (!Array.isArray(goals)) return [];
    
        const flattened = goals
          .filter((g) => g.type === "baseball")    
          .flatMap((g) => g.pitchGoals || []); 
    
        console.log("Flattened pitchingExerciseGoals:", flattened);
        return flattened;
      }, [goals]);

  const handleAddPitchGoal = () => {
    setPitchGoals((prev) => [
      ...prev,
      { name: "", minutes: "", reps: "", fastestSpeed: "", accuracy: "" },
    ]);
  };
  
  const handleRemovePitchGoal = (index) => {
    setPitchGoals((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiBaseUrl}/api/goals`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        console.log("Goals API data:", data);

        setGoals(Array.isArray(data.goals) ? data.goals : []);
      } catch (err) {
        console.error("Failed to load goals:", err);
      }
    };

    loadGoals();
  }, [apiBaseUrl, getToken]);

  const removePitchVideo = (key) => {
    setPitchData(prev => {
      const pitch = prev[key] || {};
      return {
        ...prev,
        [key]: {
          ...pitch,
          videos: [],
        },
      };
    });
  };
  
  
  

  const handleGoalSubmit = async (e, close) => {
    e.preventDefault();
    setOverlayVisible(true);
    await delay(1000);
    const token = await getToken();
    const payload = {
      type: "baseball",
      totals: {
        minutes: totalMinutesTarget,
        reps: totalRepsTarget,
        accuracy: totalAccuracyTarget,
      },
      pitchGoals: pitchGoals, 
    };
  
    const loadingId = toast.info("Saving gym goals…", { autoClose: false });
  try {
    const token = await getToken();
    const res = await fetch(`${apiBaseUrl}/api/goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to save pitching goals");

    await res.json();
    toast.success("Pitching goals saved!");
    close();
  } catch (err) {
    toast.error(err.message || "Something went wrong.");
  } finally {
    setOverlayVisible(false);
    toast.dismiss(loadingId);
  }
  };
  

  const handleExpandPitchGoal = (index) => {
    toggleExpand(index, pitchGoals, setPitchGoals);
  };

  const toggleExpand = (index, list , setList) => {
    setList((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, expanded: !item.expanded }
          : item
      )
    );
  };

  const handleRecordSessionSubmit = async (e, close) => {
    e.preventDefault();
    setOverlayVisible(true);
    await delay(1000);
    const sessionPayload = {
      kind: "baseball",
      date: sessionDay ? sessionDay.toISOString() : null,
      sessionType: "Bullpen",
      timeSpent,
      pitchData, 
    };
  
    const loadingId = toast.info("Saving session…", { autoClose: false });
    try {
      await uploadSessionToApi(sessionPayload); 
      toast.success("Session recorded!");
      close();
    } catch (err) {
      console.error(err);
      toast.error("Failed to record session.");
    } finally {
      setOverlayVisible(false);
      toast.dismiss(loadingId);
    }
  };
  const hasPitchGoals =
  Array.isArray(pitchingExerciseGoals) && pitchingExerciseGoals.length > 0;
const maxIndex = hasPitchGoals ? pitchingExerciseGoals.length : 0;

let ringContent = null;

if (activeRingIndex === 0 || !hasPitchGoals) {
  ringContent = (
    <TripleMetricRing
      key={`metric-${ringVersion}`}
      minutesPercent={totalMinutesPercent}
      setsPercent={totalAccuracyPercent} 
      repsPercent={totalRepsPercent}
    />
  );
} else {
  const goalIdx = activeRingIndex - 1;
  const goal = pitchingExerciseGoals[goalIdx];

  if (goal) {
    ringContent = (
      <PitchingRing
        key={`exercise-${ringVersion}-${goalIdx}`}
        exerciseGoals={[goal]}  
        sessions={sessions} 
      />
    );
  }
}

const handleNextRing = () => {
    const totalSlots = maxIndex + 1; 
    if (totalSlots === 0) return;
  
    setActiveRingIndex((prev) => (prev + 1) % totalSlots);
    setRingVersion((v) => v + 1);
  };
  
  const handlePrevRing = () => {
    const totalSlots = maxIndex + 1;
    if (totalSlots === 0) return;
  
    setActiveRingIndex((prev) => (prev - 1 + totalSlots) % totalSlots);
    setRingVersion((v) => v + 1);
  };


  if (selectedSession) {
    console.log("CLICKED");
    return (
      <FullScreenLayout>
        <PitchingSessionDetailCarousel
          session={selectedSession}
          allSessions={baseballSessions}
          pitchGoals={pitchingExerciseGoals}
          onBack={() => setSelectedSession(null)}
        />
      </FullScreenLayout>
    );
  }
  return (
    <section className="home-section">

      <h3 className="section-title">Sharpen Your Stuff</h3>
      <p className="section-subtitle">
        Explore suggested throwing sessions based on your pitch mix.
      </p>
      
{(
    <div className="single-goal-ring-wrapper">
      <div className="goal-ring-nav">
      <button
  type="button"
  className="mode-chip"
  onClick={handlePrevRing}
>
  ◀
</button>

<div className="goal-ring-card">
    {ringContent}
</div>

<button
  type="button"
  className="mode-chip"
  onClick={handleNextRing}
>
  ▶
</button>
      </div>
    </div>
  )}


      <div className="flexMenu">
        {/* ----- GOALS MENU ----- */}
        <Menu
          title="Set Pitching Goals"
          renderOpener={({ open, toggle }) => (
            <button
              type="button"
              className="goals-toggle-btn mode-chip"
              style={{ marginBottom: 10 }}
              onClick={toggle}
            >
              {open ? "Close Goal Settings" : "Set Pitching Goals"}
            </button>
          )}
          renderContent={({ close }) => (
            <form onSubmit={(e) => handleGoalSubmit(e, close)}>
              {/* Totals */}
              <div className="goals-row">
                <label className="goals-label">Total Minutes</label>
                <input
                  type="text"
                  className="goals-input"
                  value={totalMinutesTarget}
                  onChange={(e) => setTotalMinutesTarget(e.target.value)}
                />
              </div>
          
              <div className="goals-row">
                <label className="goals-label">Total Reps (throws)</label>
                <input
                  type="text"
                  className="goals-input"
                  value={totalRepsTarget}
                  onChange={(e) => setTotalRepsTarget(e.target.value)}
                />
              </div>
              <div className="goals-row">
                <label className="goals-label">Overall Accuracy</label>
                <input
                  type="text"
                  className="goals-input"
                  value={totalAccuracyTarget}
                  onChange={(e) => setTotalAccuracyTarget(e.target.value)}
                />
              </div>
              <>
  {pitchGoals.length === 0 ? (
    <div className="goals-row">
      <button
        type="button"
        className="goals-toggle-btn btn-secondary"
        onClick={handleAddPitchGoal}
      >
        + Add Pitch / Drill Goal
      </button>
    </div>
  ) : (
    <>
      {/* Pitch-type specific goals */}
      <div className="goals-row">
        <label className="goals-label">Pitch / Drill-specific Goals</label>
        <small className="goals-hint">
          Track workload and quality per pitch type or drill.
        </small>
      </div>

      {pitchGoals.map((pg, index) => {
        const title = pg.name || `Pitch / Drill ${index + 1}`;

        if (!pg.expanded) {
          return (
            <div
              key={index}
              className="exercise-card minimized"
              onClick={() => handleExpandPitchGoal(index)}
            >
              <div className="exercise-min-line">
                <span className="exercise-min-title">{title}</span>
                <span className="exercise-min-meta">
                  {pg.minutes && pg.reps
                    ? `${pg.minutes} min • ${pg.reps} throws`
                    : "Tap to edit"}
                  {pg.fastestSpeed && ` • Top ${pg.fastestSpeed}`}
                  {pg.accuracy && ` • ${pg.accuracy}% in zone`}
                </span>
              </div>
            </div>
          );
        }
        

        return (
          <div key={index} className="exercise-card">
            <div className="exercise-card-header" onClick={() => toggleExpand(index, pitchGoals, setPitchGoals)} style={{ cursor: "pointer" }}>
              <span className="exercise-card-title">{title}</span>
              <button
                type="button"
                className="exercise-collapse-btn"
                onClick={(e) => {
                    e.stopPropagation(); 
                    toggleExpand(index, pitchGoals, setPitchGoals);
                  }}
              >
                ⌄
              </button>
            </div>

            <div className="goals-row">
              <label className="goals-label">Pitch / Drill Name</label>
              <input
                type="text"
                className="goals-input"
                value={pg.name}
                onChange={(e) =>
                  handlePitchGoalChange(index, "name", e.target.value)
                }
              />
            </div>

            <div className="exercise-row-inline">
              <div className="goals-row">
                <label className="goals-label">Minutes</label>
                <input
                  type="text"
                  className="goals-input"
                  value={pg.minutes}
                  onChange={(e) =>
                    handlePitchGoalChange(index, "minutes", e.target.value)
                  }
                />
              </div>
              <div className="goals-row">
                <label className="goals-label">Reps (throws)</label>
                <input
                  type="text"
                  className="goals-input"
                  value={pg.reps}
                  onChange={(e) =>
                    handlePitchGoalChange(index, "reps", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="exercise-row-inline">
              <div className="goals-row">
                <label className="goals-label">Fastest Speed</label>
                <input
                  type="text"
                  className="goals-input"
                  value={pg.fastestSpeed}
                  onChange={(e) =>
                    handlePitchGoalChange(
                      index,
                      "fastestSpeed",
                      e.target.value
                    )
                  }
                />
              </div>
              <div className="goals-row">
                <label className="goals-label">Accuracy (% in zone)</label>
                <input
                  type="text"
                  className="goals-input"
                  value={pg.accuracy}
                  onChange={(e) =>
                    handlePitchGoalChange(index, "accuracy", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="goals-row" style={{ textAlign: "right" }}>
              {pitchGoals.length > 1 && (
                <button
                  type="button"
                  className="goals-toggle-btn"
                  onClick={() => handleRemovePitchGoal(index)}
                  style={{ marginRight: "0.5rem" }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div className="goals-row">
        <button
          type="button"
          className="goals-toggle-btn"
          onClick={handleAddPitchGoal}
        >
          + Add Pitch / Drill Goal
        </button>
      </div>
    </>
  )}
</>         <div className="goals-row">
              <button type="submit" className="goals-save-btn btn-save" style={{fontSize:"13px"}}>
                Save Goals
              </button>
              </div>
            </form>
          )}
          
        />
        <Menu
          title="Record Session"
          renderOpener={({ open, toggle }) => (
            <button
              type="button"
              className="goals-toggle-btn mode-chip"
              style={{ marginBottom: 10 }}
              onClick={toggle}
            >
              {open ? "Close Session Recorder" : "Record Session"}
            </button>
          )}
          renderContent={({ close }) => (
            <form onSubmit={(e) => handleRecordSessionSubmit(e, close)}>
              {/* Session Date */}
              <div className="goals-row">
                <label className="goals-label">Session Date</label>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <div className="goals-input" style={{ flex: 1 }}>
                    {sessionDay
                      ? sessionDay.toLocaleDateString()
                      : "No date selected"}
                  </div>
                  <button
                    type="button"
                    className="button-31"
                    style={{ flexShrink: 0, padding:"3px" }}
                    onClick={() => {
                      setTempSessionDay(sessionDay || new Date());
                      setShowDatePicker(true);
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendar}/>
                    {sessionDay ? "Change Date" : "Add Date"}
                  </button>
                </div>

                {showDatePicker && (
                  <div
                    className="menu-overlay"
                    onClick={() => setShowDatePicker(false)}
                  >
                    <div
                      className="menu-popover"
                      style={{ maxWidth: 400 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="menu-header">
                        <span className="menu-title">Pick a session date</span>
                        <button
                          type="button"
                          className="menu-close-btn"
                          onClick={() => setShowDatePicker(false)}
                        >
                          ×
                        </button>
                      </div>

                      <MyDatePicker
                        value={tempSessionDay}
                        onChange={(day) => {
                          if (!day) return;
                          setTempSessionDay(day);
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "8px",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          type="button"
                          className="button-31"
                          style={{ backgroundColor: "#374151" }}
                          onClick={() => setShowDatePicker(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button-31"
                          onClick={() => {
                            setSessionDay(tempSessionDay);
                            setShowDatePicker(false);
                          }}
                        >
                          Save Date
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="goals-row">
                <label className="goals-label">Time Spent</label>
                <input
                  type="text"
                  className="goals-input"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                />
              </div>


{PITCH_TYPES.map(({ key, label }) => {
  const data = pitchData[key];
  const title = label;

  if (!data.expanded) {
    const hasAny =
      data.count || data.accuracy || data.maxSpeed || data.videos.length > 0;

    return (
      <div
        key={key}
        className="exercise-card minimized"
        onClick={() => togglePitchExpanded(key)}
      >
        <div className="exercise-min-line">
          <span className="exercise-min-title">{title}</span>
          <span className="exercise-min-meta">
            {hasAny
              ? [
                  data.count && `${data.count} pitches`,
                  data.maxSpeed && `Top ${data.maxSpeed} mph`,
                  data.accuracy && `${data.accuracy}% in zone`,
                  data.videos.length
                    ? `${data.videos.length} video${data.videos.length > 1 ? "s" : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" • ")
              : "Tap to add details"}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div key={key} className="exercise-card">
      <div className="exercise-card-header" onClick={() => togglePitchExpanded(key)} style={{ cursor: "pointer" }}>
        <span className="exercise-card-title">{title}</span>
        <button
          type="button"
          className="exercise-collapse-btn"
          onClick={(e) => {
            e.stopPropagation(); 
            togglePitchExpanded(key);
          }}
        >
          ⌄
        </button>
      </div>

      <div className="exercise-row-inline">
        <div className="goals-row">
          <label className="goals-label">{label} Count</label>
          <input
            type="text"
            className="goals-input"
            value={data.count}
            onChange={(e) =>
              handlePitchFieldChange(key, "count", e.target.value)
            }
          />
        </div>

        <div className="goals-row">
          <label className="goals-label">Accuracy (% in zone)</label>
          <input
            type="text"
            className="goals-input"
            value={data.accuracy}
            onChange={(e) =>
              handlePitchFieldChange(key, "accuracy", e.target.value)
            }
          />
        </div>

        <div className="goals-row">
          <label className="goals-label">Max Speed (mph)</label>
          <input
            type="text"
            className="goals-input"
            value={data.maxSpeed}
            onChange={(e) =>
              handlePitchFieldChange(key, "maxSpeed", e.target.value)
            }
          />
        </div>
      </div>

<div className="goals-row">
  <label className="goals-label">
    {label} Video (max 1)
  </label>

  <div className="video-pill-container">
    {data.videos && data.videos.length > 0 ? (
      <div className="coach-doc-pill pending" style = {{width:"92%"}}>
        <span className="coach-doc-pill-icon">
          <FontAwesomeIcon icon={faFileVideo} />
        </span>

        <span className="coach-doc-pill-name">
          {data.videos[0].name}
        </span>

        <button
          type="button"
          className="coach-doc-pill-remove"
          onClick={() => removePitchVideo(key)}
        >
          ✕
        </button>
      </div>
    ) : (
      <label className="upload-btn">
        Upload Video
        <input
          type="file"
          accept="video/*"
          className="goals-input"
          onChange={(e) => handlePitchVideosChange(key, e)}
        />
      </label>
    )}
  </div>

  <small className="goals-hint">
    Selected: {data.videos?.length || 0} / 1
  </small>
</div>


    </div>
  );
})}

              <div className="goals-row">
              <button type="submit" className="goals-save-btn btn-save" style={{fontSize:"13px"}}>
                Save Session
              </button>
              </div>
            </form>
          )}
        />
      </div>

      <div className="card-list">
  {sessions.map((s) => {
  const dateStr = new Date(s.date).toLocaleDateString();


  const pitches = s.pitches || {};
  
  const totalPitches = Object.values(pitches)
    .reduce((sum, p) => sum + Number(p.count || 0), 0);

  const maxSpeed = Object.values(pitches)
    .reduce((max, p) => {
      const speed = Number(p.maxSpeed || 0);
      return speed > max ? speed : max;
    }, 0);

        return (
            <article key={s._id} className="session-card"       onClick={() => setSelectedSession(s)}>
            <div className="session-card-info">
                <h4 className="session-title">Pitching Session — {dateStr}</h4>
            </div>

            <p className="session-description">
                {`${totalPitches} pitches thrown`}
            </p>

            <div className="session-meta">
                <span>⏱ {s.timeSpent || "N/A"} time spent</span>
                <span>🔥 Max Speed: {maxSpeed > 0 ? `${maxSpeed} mph` : "N/A"}</span>
                <span>📋 {totalPitches} total pitches</span>
            </div>
            </article>
        );
        })}
        </div>
    </section>
  );
}

export default PitchingDashboard;
