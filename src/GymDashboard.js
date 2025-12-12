// GymDashboard.js
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import Menu from "./Menu";
import MyDatePicker from "./MyDatePicker";
import TripleExerciseMaxRing from "./TripleExerciseMaxRing";
import TripleMetricRing from "./TripleMetricRing";
import "react-circular-progressbar/dist/styles.css";
import { toast } from 'react-toastify';
import GymSessionDetailCarousel from "./GymSessionDetailCarousel.js";
import FullScreenLayout from "./FullScreenLayout.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faFileCirclePlus, faFileVideo } from "@fortawesome/free-solid-svg-icons";
function GymDashboard({ sessions, uploadSessionToApi, apiBaseUrl, setOverlayVisible }) {
  const { getToken } = useAuth();
  const [selectedSession, setSelectedSession] = useState(null);
  const [totalMinutesTarget, setTotalMinutesTarget] = useState("");
  const [totalRepsTarget, setTotalRepsTarget] = useState("");
  const [totalSetsTarget, setTotalSetsTarget] = useState("");
  const [exerciseGoals, setExerciseGoals] = useState([]);
  const [activeRingIndex, setActiveRingIndex] = useState(0); 
  const [ringVersion, setRingVersion] = useState(0); 
  const [sessionDay, setSessionDay] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSessionDay, setTempSessionDay] = useState(null);
  const [timeSpent, setTimeSpent] = useState("");
  const [goals, setGoals] = useState([]);
  const [gymExercises, setGymExercises] = useState([]);
  const [goalScope, setGoalScope] = useState("lifetime");
  const [goalDate, setGoalDate] = useState(null);
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);
  const [tempGoalDate, setTempGoalDate] = useState(null);
  const [ringGoalSelection, setRingGoalSelection] = useState("lifetime");


  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const {
  totalMinutesGoal,
  totalSetsGoal,
  totalRepsGoal,
  gymDatedGoals,
  selectedGymExerciseGoals,
} = useMemo(() => {
  if (!Array.isArray(goals)) {
    return {
      totalMinutesGoal: 0,
      totalSetsGoal: 0,
      totalRepsGoal: 0,
      gymDatedGoals: [],
      selectedGymExerciseGoals: [],
    };
  }
  // Only gym goals
  const gymGoals = goals.filter((g) => g.type === "gym");

  const lifetimeGoals = gymGoals.filter((g) => g.scope === "lifetime");
  const datedGoals = gymGoals.filter(
    (g) => g.scope === "dated" && g.targetDate
  );

  // Most recent lifetime goal (by createdAt)
  const latestLifetime = lifetimeGoals.length
    ? [...lifetimeGoals].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0]
    : null;

  let selectedGoal = null;

  if (ringGoalSelection === "lifetime") {
    // ONLY the latest lifetime goal (or null if none)
    selectedGoal = latestLifetime;
  } else if (ringGoalSelection) {
    // Specific dated goal by _id
    selectedGoal =
      datedGoals.find(
        (g) => String(g._id) === String(ringGoalSelection)
      ) || null;
  }

  const totals = selectedGoal?.totals || {};
  const selectedExerciseGoals = Array.isArray(selectedGoal?.exerciseGoals)
    ? selectedGoal.exerciseGoals
    : [];

  return {
    totalMinutesGoal: toNum(totals.minutes),
    totalSetsGoal: toNum(totals.sets),
    totalRepsGoal: toNum(totals.reps),
    gymDatedGoals: datedGoals,
    // 👇 this is the important line
    selectedGymExerciseGoals: selectedExerciseGoals,
  };
}, [goals, ringGoalSelection]);

const handleSessionClick = (session) => {
  setSelectedSession(session);
};

  const getTotalGymVideos = (exercises) =>
    exercises.filter((ex) => ex.video).length;
  
    useEffect(() => {
        const loadGoals = async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${apiBaseUrl}/api/goals`, {
              headers: { Authorization: `Bearer ${token}` },
            });
    
            const data = await res.json();
    
            // Make sure this is an array
            setGoals(Array.isArray(data.goals) ? data.goals : []);
          } catch (err) {
            console.error("Failed to load goals:", err);
          }
        };
    
        loadGoals();
      }, [apiBaseUrl, getToken]);
    

  const handleAddGymExercise = () => {
    setGymExercises((prev) => {
      const collapsed = prev.map((ex) => ({ ...ex, expanded: false }));
      return [
        ...collapsed,
        {
          name: "",
          sets: "",
          reps: "",
          maxWeight: "",
          video: null,
          expanded: true,
        },
      ];
    });
  };




  
  const handleGymExerciseChange = (index, field, value) => {
    setGymExercises((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleGymExerciseVideoChange = (index, e) => {
    const file = (e.target.files && e.target.files[0]) || null;
  
    setGymExercises((prev) => {
      const updated = [...prev];
  
      const hadVideo = !!updated[index].video;
      const totalExisting = prev.filter((ex) => ex.video).length;
  
      if (file && !hadVideo && totalExisting >= 5) {
        alert("You can attach up to 5 videos total across all exercises.");
        return prev;
      }
  
      updated[index] = {
        ...updated[index],
        video: file,
      };
  
      return updated;
    });
  };
  
  
  const removeGymExerciseVideo = (index) => {
    setGymExercises((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        video: null,
      };
      return updated;
    });
  };
  
  


  

  
  

  const actualSetsReps = sessions
  .filter(s => s.kind === "gym")
  .flatMap(s => s.exercises || [])
  .reduce((sum, ex) => sum + toNum(ex.sets), 0);

  const totalSetsPercent = 
  totalSetsGoal > 0
  ? Math.min(100, (actualSetsReps / totalSetsGoal) * 100)
  : 0;

  const actualReps = sessions
  .filter((s) => s.kind === "gym")
  .flatMap((s) => s.exercises || [])
  .reduce((sum, ex) => {
    const sets = toNum(ex.sets);
    const reps = toNum(ex.reps); 
    return sum + sets * reps;
  }, 0);

  const totalRepsPercent =
  totalRepsGoal > 0
    ? Math.min(100, (actualReps / totalRepsGoal) * 100)
    : 0;
  const actualTotalMinutes = sessions.reduce((sum, s) => {
    if (s.kind !== "gym") return sum;
    return sum + toNum(s.timeSpent);
  }, 0);

  const totalMinutesPercent =
    totalMinutesGoal > 0
      ? Math.min(100, (actualTotalMinutes / totalMinutesGoal) * 100)
      : 0;
  

  
  const handleExerciseGoalChange = (index, field, value) => {
    setExerciseGoals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
  const handleNext = () => {
    const totalSlots = maxIndex + 1;
    if (totalSlots === 0) return; 
  
    setActiveRingIndex((prev) => (prev + 1) % totalSlots);
    setRingVersion((v) => v + 1);
  };
  
  const handlePrev = () => {
    const totalSlots = maxIndex + 1;
    if (totalSlots === 0) return;
  
    setActiveRingIndex((prev) => (prev - 1 + totalSlots) % totalSlots);
    setRingVersion((v) => v + 1);
  };

  
  const handleAddExerciseGoal = () => {
    setExerciseGoals((prev) => {
      const collapsed = prev.map((g) => ({ ...g, expanded: false }));
      return [
        ...collapsed,
        { name: "", minutes: "", reps: "", max: "", expanded: true },
      ];
    });
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

  const handleExpandGymExercise = (index) => {
    setGymExercises((prev) =>
      prev.map((ex, i) => ({
        ...ex,
        expanded: i === index,
      }))
    );
  };

  const handleExpandExerciseGoal = (index) => {
    setExerciseGoals((prev) =>
      prev.map((g, i) => ({
        ...g,
        expanded: i === index,
      }))
    );
  };
  const gymExerciseGoals = useMemo(() => {
    if (!Array.isArray(goals)) return [];

    const flattened = goals
      .filter((g) => g.type === "gym")
      .flatMap((g) => g.exerciseGoals || []);

    return flattened;
  }, [goals]);

const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const hydrateFromGoalDoc = (goalDoc) => {
  if (!goalDoc) return;

  const totals = goalDoc.totals || {};

  setTotalMinutesTarget(
    totals.minutes !== undefined ? String(totals.minutes) : ""
  );
  setTotalRepsTarget(
    totals.reps !== undefined ? String(totals.reps) : ""
  );
  setTotalSetsTarget(
    totals.sets !== undefined ? String(totals.sets) : ""
  );

  const exGoals = Array.isArray(goalDoc.exerciseGoals)
    ? goalDoc.exerciseGoals.map((g) => ({
        name: g.name || "",
        minutes: g.minutes !== undefined ? String(g.minutes) : "",
        reps: g.reps !== undefined ? String(g.reps) : "",
        max: g.max || "",
        expanded: false,
      }))
    : [];

  setExerciseGoals(exGoals);
};

const hydrateFromLifetimeGoal = (allGoals) => {
  if (!Array.isArray(allGoals)) return;

  const gymLifetimeGoals = allGoals.filter(
    (g) => g.type === "gym" && g.scope === "lifetime"
  );

  if (!gymLifetimeGoals.length) {
    // Nothing saved yet → clear form
    setTotalMinutesTarget("");
    setTotalRepsTarget("");
    setTotalSetsTarget("");
    setExerciseGoals([]);
    setGoalDate(null);
    return;
  }

  // Use latest by createdAt (or updatedAt if you prefer)
  const latest = [...gymLifetimeGoals].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  const totals = latest.totals || {};

  setTotalMinutesTarget(
    totals.minutes !== undefined ? String(totals.minutes) : ""
  );
  setTotalRepsTarget(
    totals.reps !== undefined ? String(totals.reps) : ""
  );
  setTotalSetsTarget(
    totals.sets !== undefined ? String(totals.sets) : ""
  );

  const exGoals = Array.isArray(latest.exerciseGoals)
    ? latest.exerciseGoals.map((g) => ({
        name: g.name || "",
        minutes: g.minutes !== undefined ? String(g.minutes) : "",
        reps: g.reps !== undefined ? String(g.reps) : "",
        max: g.max || "",
        expanded: false,
      }))
    : [];

  setExerciseGoals(exGoals);
  setGoalDate(null);
};
const handleGoalScopeChange = (value) => {
  setGoalScope(value);

  if (value === "lifetime") {
    hydrateFromLifetimeGoal(goals);
  }
  else{
    setTotalMinutesTarget("");
    setTotalRepsTarget("");
    setTotalSetsTarget("");
    setExerciseGoals([]);
    setGoalDate(null);
  }

  // if "dated", we just leave fields as-is and let user set them
};
useEffect(() => {
  if (goalScope !== "dated" || !goalDate || !Array.isArray(goals)) return;

  const datedGymGoals = goals.filter(
    (g) => g.type === "gym" && g.scope === "dated" && g.targetDate
  );

  if (!datedGymGoals.length) return;

  const matching = datedGymGoals.filter((g) => {
    const target = new Date(g.targetDate);
    return isSameDay(target, goalDate);
  });

  if (!matching.length) {
    return;
  }

  const latest = [...matching].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  hydrateFromGoalDoc(latest);
}, [goalScope, goalDate, goals]);

  const handleGoalSubmit = async (e, close) => {
  e.preventDefault();
  setOverlayVisible(true);
  await delay(1000);
  const payload = {
    type: "gym",
    scope: goalScope, 
    targetDate:
      goalScope === "dated" && goalDate
        ? goalDate.toISOString()
        : null,
    totals: {
      minutes: totalMinutesTarget,
      reps: totalRepsTarget,
      sets: totalSetsTarget,
    },
    exerciseGoals: exerciseGoals.map(({ name, minutes, reps, max }) => ({
      name,
      minutes,
      reps,
      max,
    })),
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

    if (!res.ok) throw new Error("Failed to save gym goals");

    await res.json();
    toast.success("Gym goals saved!");
    close();
  } catch (err) {
    toast.error(err.message || "Something went wrong.");
  } finally {
    setOverlayVisible(false);
    toast.dismiss(loadingId);
  }
};

useEffect(() => {
  if (goalScope === "lifetime") {
    hydrateFromLifetimeGoal(goals);
  }
}, [goals, goalScope]);
  
  const handleRecordSessionSubmit = async (e, close) => {
    e.preventDefault();
    setOverlayVisible(true);
    await delay(1000);
    const sessionPayload = {
      kind: "gym",
      date: sessionDay ? sessionDay.toISOString() : null,
      sessionType: "Strength",
      timeSpent,
    };
  
    const loadingId = toast.info("Saving session…", { autoClose: false });
    
    try {
      await uploadSessionToApi(sessionPayload, gymExercises, {});
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

  const hasGymGoals =
  Array.isArray(selectedGymExerciseGoals) &&
  selectedGymExerciseGoals.length > 0;

const maxIndex = hasGymGoals ? selectedGymExerciseGoals.length : 0;


let ringContent = null;

if (activeRingIndex === 0 || !hasGymGoals) {
  ringContent = (
    <TripleMetricRing
      key={`metric-${ringVersion}`}
      minutesPercent={totalMinutesPercent}
      repsPercent={totalRepsPercent}
      setsPercent={totalSetsPercent}
    />
  );
} else {
  const goalIdx = activeRingIndex - 1;
  const goal = selectedGymExerciseGoals[goalIdx];

  if (goal) {
    ringContent = (
      <TripleExerciseMaxRing
        key={`exercise-${ringVersion}-${goalIdx}`}
        exerciseGoals={[goal]}
        sessions={sessions}
      />
    );
  }
}

if (selectedSession) {
  return (
    <FullScreenLayout>
    <GymSessionDetailCarousel
      session={selectedSession}
      allSessions = {sessions}
      goals = {goals}
      onBack={() => handleSessionClick(null)}
    />
    </FullScreenLayout>
  );
}

  return (
    <section className="home-section">

      <h3 className="section-title">Keep Raising Your Level</h3>
      <p className="section-subtitle">
        Explore suggested gym sessions based on your goals.
      </p>
      <section className="home-section">
  {/* Goal selection for the totals ring */}
  <div className="goals-row" style={{ marginBottom: 8 }}>
    <select
      className="goals-input black-select"
      style={{ maxWidth: 260 }}
      value={ringGoalSelection}
      onChange={(e) => setRingGoalSelection(e.target.value)}
    >
      <option value="lifetime">Lifetime goal</option>
      {gymDatedGoals.map((g) => (
        <option key={g._id} value={String(g._id)}>
          {g.targetDate
  ? `By ${new Date(g.targetDate).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`
  : "Dated goal"}
        </option>
      ))}
    </select>
  </div>

  {/* --- Single Goal Ring with navigation --- */}
  <div className="single-goal-ring-wrapper">
    <div className="goal-ring-nav">
      <button
        type="button"
        className="mode-chip"
        onClick={handlePrev}
      >
        ◀
      </button>

      <div className="goal-ring-card">
        {ringContent}
      </div>

      <button
        type="button"
        className="mode-chip"
        onClick={handleNext}
      >
        ▶
      </button>
    </div>
  </div>
</section>

      <div className="flexMenu">
        <Menu
          title="Set Gym Goals"
          renderOpener={({ open, toggle }) => (
            <button
              type="button"
              className="goals-toggle-btn mode-chip"
              style={{ marginBottom: 10 }}
              onClick={toggle}
            >
              {open ? "Close Goal Settings" : "Set Gym Goals"}
            </button>
          )}
          renderContent={({ close }) => (
            <form onSubmit={(e) => handleGoalSubmit(e, close)}>
    {/* Goal timeframe selector */}
    <div className="goals-row">
      <label className="goals-label">Goal timeframe</label>
      <select
        className="goals-input"
        value={goalScope}
        onChange={(e) => handleGoalScopeChange(e.target.value)}
      >
        <option value="lifetime">Lifetime goal</option>
        <option value="dated">Target by date</option>
      </select>
    </div>
    {goalScope === "dated" && (
      <div className="goals-row">
        <label className="goals-label">Target date</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="goals-input" style={{ flex: 1 }}>
            {goalDate
              ? goalDate.toLocaleDateString()
              : "No date selected"}
          </div>
          <button
            type="button"
            className="button-31"
            style={{ flexShrink: 0, width: "40%", padding: "3px" }}
            onClick={() => {
              setTempGoalDate(goalDate || new Date());
              setShowGoalDatePicker(true);
            }}
          >
            <FontAwesomeIcon icon={faCalendar} />
            {goalDate ? "Change Date" : "Add Date"}
          </button>
        </div>

        {showGoalDatePicker && (
          <div
            className="menu-overlay"
            onClick={() => setShowGoalDatePicker(false)}
          >
            <div
              className="menu-popover"
              style={{ maxWidth: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menu-header">
                <span className="menu-title">Pick a target date</span>
                <button
                  type="button"
                  className="menu-close-btn"
                  onClick={() => setShowGoalDatePicker(false)}
                >
                  ×
                </button>
              </div>

              <MyDatePicker
                value={tempGoalDate}
                onChange={(day) => {
                  if (!day) return;
                  setTempGoalDate(day);
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
                  onClick={() => setShowGoalDatePicker(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button-31"
                  onClick={() => {
                    setGoalDate(tempGoalDate);
                    setShowGoalDatePicker(false);
                  }}
                >
                  Save Date
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
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
      <label className="goals-label">Total Reps</label>
      <input
        type="text"
        className="goals-input"
        value={totalRepsTarget}
        onChange={(e) => setTotalRepsTarget(e.target.value)}
      />
    </div>

    <div className="goals-row">
      <label className="goals-label">Total Sets</label>
      <input
        type="text"
        className="goals-input"
        value={totalSetsTarget}
        onChange={(e) => setTotalSetsTarget(e.target.value)}
      />
    </div>

<>
  {exerciseGoals.length === 0 ? (
    <div className="goals-row">
      <button
        type="button"
        className="goals-toggle-btn btn-secondary"
        onClick={handleAddExerciseGoal}
      >
        + Add Goal
      </button>
    </div>
  ) : (
    <>
      <div className="goals-row">
        <label className="goals-label">Exercise-specific Goals</label>
        <small className="goals-hint">
          Set minutes, reps, and max targets per key lift.
        </small>
      </div>

      {exerciseGoals.map((ex, index) => {
        const title = ex.name || `Goal ${index + 1}`;

        if (!ex.expanded) {
          return (
            <div
              key={index}
              className="exercise-card minimized"
              onClick={() => handleExpandExerciseGoal(index)}
            >
              <div className="exercise-min-line">
                <span className="exercise-min-title">{title}</span>
                <span className="exercise-min-meta">
                  {ex.minutes && ex.reps
                    ? `${ex.minutes} min • ${ex.reps} reps`
                    : "Tap to edit"}
                  {ex.max && ` • Max ${ex.max}`}
                </span>
              </div>
            </div>
          );
        }
        return (
          <div key={index} className="exercise-card">
            <div className="exercise-card-header" onClick={() => toggleExpand(index, exerciseGoals, setExerciseGoals)} style={{ cursor: "pointer" }}>
              <span className="exercise-card-title">{title}</span>
              <button
                type="button"
                className="exercise-collapse-btn"
                onClick={(e) => {
                  e.stopPropagation(); 
                  toggleExpand(index, exerciseGoals, setExerciseGoals);
                }}
              >
                ⌄
              </button>
            </div>

            <div className="goals-row">
              <label className="goals-label">Exercise Name</label>
              <input
                type="text"
                className="goals-input"
                value={ex.name}
                onChange={(e) =>
                  handleExerciseGoalChange(index, "name", e.target.value)
                }
              />
            </div>

            <div className="exercise-row-inline">
              <div className="goals-row">
                <label className="goals-label">Minutes</label>
                <input
                  type="text"
                  className="goals-input"
                  value={ex.minutes}
                  onChange={(e) =>
                    handleExerciseGoalChange(index, "minutes", e.target.value)
                  }
                />
              </div>
              <div className="goals-row">
                <label className="goals-label">Reps for Max</label>
                <input
                  type="text"
                  className="goals-input"
                  value={ex.reps}
                  onChange={(e) =>
                    handleExerciseGoalChange(index, "reps", e.target.value)
                  }
                />
              </div>
              <div className="goals-row">
                <label className="goals-label">Max</label>
                <input
                  type="text"
                  className="goals-input"
                  value={ex.max}
                  onChange={(e) =>
                    handleExerciseGoalChange(index, "max", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="goals-row">
        <button
          type="button"
          className="goals-toggle-btn btn-secondary"
          onClick={handleAddExerciseGoal}
        >
          + Add Next Goal
        </button>
      </div>
    </>
  )}
</>           <div className="goals-row">
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
              <div className="goals-row">
                <label className="goals-label">Session Date</label>
                <div
                  style={{ display: "flex", gap: "8px" }}
                >
                  <div className="goals-input" style={{ flex: 1 }}>
                    {sessionDay
                      ? sessionDay.toLocaleDateString()
                      : "No date selected"}
                  </div>
                  <button
                    type="button"
                    className="button-31"
                    style={{ flexShrink: 0, width:"35%", padding:"3px" }}
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
              <>
                {gymExercises.length === 0 ? (
                  <div className="goals-row">
                    <button
                      type="button"
                      className="goals-toggle-btn btn-secondary"
                      onClick={handleAddGymExercise}
                    >
                      + Add First Exercise
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="goals-row">
                      <label className="goals-label">Exercises</label>
                      <small className="goals-hint">
                        Previous exercises are minimized. Tap to expand and edit.
                      </small>
                    </div>

                    {gymExercises.map((ex, index) => {
                      const totalVideos = getTotalGymVideos(gymExercises);
                      const title = ex.name || `Exercise ${index + 1}`;

                      if (!ex.expanded) {
                        return (
                          <div
                            key={index}
                            className="exercise-card minimized"
                            onClick={() => handleExpandGymExercise(index)}
                          >
                            <div className="exercise-min-line">
                              <span className="exercise-min-title">
                                {title}
                              </span>
                              <span className="exercise-min-meta">
                                {ex.sets && ex.reps
                                  ? `${ex.sets} x ${ex.reps}`
                                  : "Tap to edit"}
                                {ex.maxWeight && ` • Max ${ex.maxWeight}`}
                                {ex.video && " • 🎥"}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={index} className="exercise-card">
                          <div className="exercise-card-header" onClick={() => toggleExpand(index, gymExercises, setGymExercises)} style={{ cursor: "pointer" }}>
                            <span className="exercise-card-title">{title}</span>
                            <button
                              type="button"
                              className="exercise-collapse-btn"
                              onClick={(e) => {
                                e.stopPropagation(); 
                                toggleExpand(index, gymExercises, setGymExercises);
                              }}
                            >
                              ⌄
                            </button>
                          </div>

                          <div className="goals-row">
                            <label className="goals-label">Exercise Name</label>
                            <input
                              type="text"
                              className="goals-input"
                              value={ex.name}
                              onChange={(e) =>
                                handleGymExerciseChange(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="exercise-row-inline">
                            <div className="goals-row">
                              <label className="goals-label">Sets</label>
                              <input
                                type="text"
                                className="goals-input"
                                value={ex.sets}
                                onChange={(e) =>
                                  handleGymExerciseChange(
                                    index,
                                    "sets",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="goals-row">
                              <label className="goals-label">Reps per Set</label>
                              <input
                                type="text"
                                className="goals-input"
                                value={ex.reps}
                                onChange={(e) =>
                                  handleGymExerciseChange(
                                    index,
                                    "reps",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="goals-row">
                              <label className="goals-label">Max Weight</label>
                              <input
                                type="text"
                                className="goals-input"
                                value={ex.maxWeight}
                                onChange={(e) =>
                                  handleGymExerciseChange(
                                    index,
                                    "maxWeight",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="goals-row">
                              <label className="goals-label">Exercise Video (optional)</label>

                              <div className="video-pill-container">
                                {ex.video ? (
                                  <div className="coach-doc-pill pending" style={{width:"92%"}}>
                                    <span className="coach-doc-pill-icon">
                                      <FontAwesomeIcon icon={faFileVideo} />
                                    </span>

                                    <span className="coach-doc-pill-name">
                                      {ex.video.name}
                                    </span>

                                    <button
                                      type="button"
                                      className="coach-doc-pill-remove"
                                      onClick={() => removeGymExerciseVideo(index)}
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
                                      onChange={(e) => handleGymExerciseVideoChange(index, e)}
                                    />
                                  </label>
                                )}
                              </div>

                              <small className="goals-hint">
                                Attached: {ex.video ? 1 : 0} / 1
                              </small>
                            </div>


                        </div>
                      );
                    })}

                    <div className="goals-row">
                      <button
                        type="button"
                        className="goals-toggle-btn btn-secondary"
                        onClick={handleAddGymExercise}
                      >
                        + Add Next Exercise
                      </button>
                    </div>
                  </>
                )}
              </>
              <div className="goals-row">
              <button type="submit" className="goals-save-btn btn-save" style={{fontSize: "13px"}}>
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
          const totalSets =
            s.exercises?.reduce((sum, ex) => sum + (ex.sets || 0), 0) || 0;

          return (
            <article key={s._id} className="session-card" onClick={() => handleSessionClick(s)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSessionClick(s);
            }}>
              <div className="session-card-info">
                <h4 className="session-title">Gym Session — {dateStr}</h4>
              </div>


              <p className="session-description">
                {`${s.exercises?.length || 0} exercises logged`}
              </p>

              <div className="session-meta">
                <span>⏱ {s.timeSpent || "N/A"}</span>
                <span>🏋️ {totalSets} sets</span>
                <span>📋 {s.exercises?.length || 0} exercises</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default GymDashboard;
