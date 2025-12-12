import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import Menu from "./Menu";
import TripleMetricRing from "./TripleMetricRing";
import PitchingRing from "./PitchingRing.js";
import MyDatePicker from "./MyDatePicker";
import { toast } from "react-toastify";
import FullScreenLayout from "./FullScreenLayout";
import PitchingSessionDetailCarousel from "./PitchingSessionDetailCarousel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faFileVideo } from "@fortawesome/free-solid-svg-icons";

function PitchingDashboard({
  sessions,
  uploadSessionToApi,
  apiBaseUrl,
  setOverlayVisible,
}) {
  const { getToken } = useAuth();

  // ----- RING + GOALS STATE -----
  const [activeRingIndex, setActiveRingIndex] = useState(0);
  const [ringVersion, setRingVersion] = useState(0);
  const [goals, setGoals] = useState([]);

  // Totals (form)
  const [totalMinutesTarget, setTotalMinutesTarget] = useState("");
  const [totalRepsTarget, setTotalRepsTarget] = useState("");
  const [totalAccuracyTarget, setTotalAccuracyTarget] = useState("");

  const FIXED_PITCH_GOALS = [
    { pitchType: "FB", name: "Fastball (FB)", minutes: "", reps: "", fastestSpeed: "", accuracy: "", expanded: false },
    { pitchType: "SL", name: "Slider (SL)", minutes: "", reps: "", fastestSpeed: "", accuracy: "", expanded: false },
    { pitchType: "CH", name: "Changeup (CH)", minutes: "", reps: "", fastestSpeed: "", accuracy: "", expanded: false },
    { pitchType: "CB", name: "Curveball (CB)", minutes: "", reps: "", fastestSpeed: "", accuracy: "", expanded: false },
  ];
  
  const [pitchGoals, setPitchGoals] = useState(FIXED_PITCH_GOALS);
  
  const normalizePitchKey = (g) => {
    // Prefer an explicit pitchType if your backend stores it
    const k = (g?.pitchType || g?.pitchKey || "").toString().toUpperCase().trim();
    if (["FB", "SL", "CH", "CB"].includes(k)) return k;
  
    // Fallback: infer from name (older docs)
    const name = (g?.name || "").toLowerCase();
    if (name.includes("fastball") || name.includes("(fb)")) return "FB";
    if (name.includes("slider") || name.includes("(sl)")) return "SL";
    if (name.includes("changeup") || name.includes("(ch)")) return "CH";
    if (name.includes("curve") || name.includes("(cb)")) return "CB";
    return null;
  };
  
  const hydrateFromBaseballGoalDoc = (goalDoc) => {
    const saved = Array.isArray(goalDoc?.pitchGoals) ? goalDoc.pitchGoals : [];
  
    // Build lookup from saved goals
    const savedByKey = new Map();
    for (const g of saved) {
      const key = normalizePitchKey(g);
      if (!key) continue;
      savedByKey.set(key, g);
    }
  
    // Merge into the fixed 4 (never lose rows)
    const merged = FIXED_PITCH_GOALS.map((base) => {
      const g = savedByKey.get(base.pitchType);
      if (!g) return { ...base, expanded: false };
  
      return {
        ...base,
        minutes: g.minutes !== undefined ? String(g.minutes) : "",
        reps: g.reps !== undefined ? String(g.reps) : "",
        fastestSpeed: g.fastestSpeed !== undefined ? String(g.fastestSpeed) : "",
        accuracy: g.accuracy !== undefined ? String(g.accuracy) : "",
        expanded: false,
      };
    });
  
    setPitchGoals(merged);
  };
  

  
  // Scope + target date for goals
  const [goalScope, setGoalScope] = useState("lifetime");
  const [goalDate, setGoalDate] = useState(null);
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);
  const [tempGoalDate, setTempGoalDate] = useState(null);

  // What the totals ring is comparing against
  const [ringGoalSelection, setRingGoalSelection] = useState("lifetime");

  // ----- SESSION STATE -----
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDay, setSessionDay] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSessionDay, setTempSessionDay] = useState(null);
  const [timeSpent, setTimeSpent] = useState("");

  // Pitch-type session data
  const PITCH_TYPES = [
    { key: "FB", label: "Fastball (FB)" },
    { key: "SL", label: "Slider (SL)" },
    { key: "CH", label: "Changeup (CH)" },
    { key: "CB", label: "Curveball (CB)" },
  ];

  const [pitchData, setPitchData] = useState({
    FB: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
    SL: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
    CH: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
    CB: { count: "", accuracy: "", maxSpeed: "", videos: [], expanded: false },
  });

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getSessionPitches = (s) => {
    if (s && s.pitches && typeof s.pitches === "object") return s.pitches;
    if (s && s.pitchData && typeof s.pitchData === "object") return s.pitchData;
    return {};
  };

  const baseballSessions = useMemo(
    () =>
      Array.isArray(sessions)
        ? sessions.filter((s) => s.kind === "baseball")
        : [],
    [sessions]
  );

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

  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };
/*
  const hydrateFromBaseballGoalDoc = (goalDoc) => {
    if (!goalDoc) return;

    const totals = goalDoc.totals || {};

    setTotalMinutesTarget(
      totals.minutes !== undefined ? String(totals.minutes) : ""
    );
    setTotalRepsTarget(
      totals.reps !== undefined ? String(totals.reps) : ""
    );
    setTotalAccuracyTarget(
      totals.accuracy !== undefined ? String(totals.accuracy) : ""
    );

    const pg = Array.isArray(goalDoc.pitchGoals)
      ? goalDoc.pitchGoals.map((g) => ({
          name: g.name || "",
          minutes: g.minutes !== undefined ? String(g.minutes) : "",
          reps: g.reps !== undefined ? String(g.reps) : "",
          fastestSpeed:
            g.fastestSpeed !== undefined ? String(g.fastestSpeed) : "",
          accuracy:
            g.accuracy !== undefined ? String(g.accuracy) : "",
          expanded: false,
        }))
      : [];
    setPitchGoals(pg);
  };
*/
  const hydrateFromBaseballLifetimeGoal = (allGoals) => {
    if (!Array.isArray(allGoals)) return;

    const lifetimeBaseballGoals = allGoals.filter(
      (g) => g.type === "baseball" && g.scope === "lifetime"
    );

    if (!lifetimeBaseballGoals.length) {
      setTotalMinutesTarget("");
      setTotalRepsTarget("");
      setTotalAccuracyTarget("");
      setGoalDate(null);
      return;
    }

    const latest = [...lifetimeBaseballGoals].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    hydrateFromBaseballGoalDoc(latest);
    setGoalDate(null);
  };

  const handleGoalScopeChange = (value) => {
    setGoalScope(value);

    if (value === "lifetime") {
      hydrateFromBaseballLifetimeGoal(goals);
    } else {
      setTotalMinutesTarget("");
      setTotalRepsTarget("");
      setTotalAccuracyTarget("");
      setGoalDate(null);
    }
  };

  useEffect(() => {
    if (goalScope === "lifetime") {
      hydrateFromBaseballLifetimeGoal(goals);
    }
  }, [goals, goalScope]);

  useEffect(() => {
    if (goalScope !== "dated" || !goalDate || !Array.isArray(goals)) return;

    const datedBaseballGoals = goals.filter(
      (g) => g.type === "baseball" && g.scope === "dated" && g.targetDate
    );

    if (!datedBaseballGoals.length) return;

    const matching = datedBaseballGoals.filter((g) => {
      const target = new Date(g.targetDate);
      return isSameDay(target, goalDate);
    });

    if (!matching.length) return;

    const latest = [...matching].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    hydrateFromBaseballGoalDoc(latest);
  }, [goalScope, goalDate, goals]);

  const {
    totalMinutesGoal,
    totalRepsGoal,
    goalAccuracyTarget,
    baseballDatedGoals,
    selectedPitchGoals,
  } = useMemo(() => {
    if (!Array.isArray(goals)) {
      return {
        totalMinutesGoal: 0,
        totalRepsGoal: 0,
        goalAccuracyTarget: 0,
        baseballDatedGoals: [],
        selectedPitchGoals: [],
      };
    }

    const baseballGoals = goals.filter((g) => g.type === "baseball");

    const lifetimeGoals = baseballGoals.filter(
      (g) => g.scope === "lifetime"
    );
    const datedGoals = baseballGoals.filter(
      (g) => g.scope === "dated" && g.targetDate
    );

    const latestLifetime = lifetimeGoals.length
      ? [...lifetimeGoals].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0]
      : null;

    let selectedGoal = null;

    if (ringGoalSelection === "lifetime") {
      selectedGoal = latestLifetime;
    } else if (ringGoalSelection) {
      selectedGoal =
        datedGoals.find(
          (g) => String(g._id) === String(ringGoalSelection)
        ) || null;
    }

    const totals = selectedGoal?.totals || {};
    const selectedPg = Array.isArray(selectedGoal?.pitchGoals)
      ? selectedGoal.pitchGoals
      : [];

    return {
      totalMinutesGoal: toNum(totals.minutes),
      totalRepsGoal: toNum(totals.reps),
      goalAccuracyTarget: toNum(totals.accuracy),
      baseballDatedGoals: datedGoals,
      selectedPitchGoals: selectedPg,
    };
  }, [goals, ringGoalSelection]);

  // ---------- METRICS FROM SESSIONS ----------
  const actualTotalReps = sessions
    .filter((s) => s.kind === "baseball")
    .reduce((sum, s) => {
      const pitches = getSessionPitches(s);
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

  const accuracyAgg = sessions
    .filter((s) => s.kind === "baseball")
    .reduce(
      (acc, s) => {
        const pitches = getSessionPitches(s);
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
    goalAccuracyTarget > 0
      ? Math.min(100, (actualAccuracy / goalAccuracyTarget) * 100)
      : 0;

  const actualTotalMinutes = sessions.reduce((sum, s) => {
    if (s.kind !== "baseball") return sum;
    return sum + toNum(s.timeSpent);
  }, 0);

  const totalMinutesPercent =
    totalMinutesGoal > 0
      ? Math.min(100, (actualTotalMinutes / totalMinutesGoal) * 100)
      : 0;

  // ---------- PITCH GOALS STATE HANDLERS ----------
  const handlePitchGoalChange = (index, field, value) => {
    setPitchGoals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleExpand = (index, list, setList) => {
    setList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const handleExpandPitchGoal = (index) => {
    toggleExpand(index, pitchGoals, setPitchGoals);
  };

  // ---------- PITCH DATA HANDLERS (SESSION) ----------
  const togglePitchExpanded = (typeKey) => {
    setPitchData((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        expanded: !prev[typeKey].expanded,
      },
    }));
  };

  const handlePitchFieldChange = (typeKey, field, value) => {
    setPitchData((prev) => ({
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

    setPitchData((prev) => {
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

  const removePitchVideo = (key) => {
    setPitchData((prev) => {
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

  // ---------- SAVE GOALS ----------
  const handleGoalSubmit = async (e, close) => {
    e.preventDefault();
    setOverlayVisible(true);
    await delay(1000);

    const payload = {
      type: "baseball",
      scope: goalScope,
      targetDate:
        goalScope === "dated" && goalDate
          ? goalDate.toISOString()
          : null,
      totals: {
        minutes: totalMinutesTarget,
        reps: totalRepsTarget,
        accuracy: totalAccuracyTarget,
      },
      pitchGoals: pitchGoals,
    };

    const loadingId = toast.info("Saving pitching goals…", {
      autoClose: false,
    });

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

  // ---------- SAVE SESSION ----------
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

  // ---------- RING CONTENT ----------
  const hasPitchGoals =
    Array.isArray(selectedPitchGoals) && selectedPitchGoals.length > 0;
  const maxIndex = hasPitchGoals ? selectedPitchGoals.length : 0;

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
    const goal = selectedPitchGoals[goalIdx];

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
    const totalSlots = maxIndex + 1; // metrics + N pitch goals
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

  // ---------- FULLSCREEN SESSION VIEW ----------
  if (selectedSession) {
    return (
      <FullScreenLayout>
        <PitchingSessionDetailCarousel
          session={selectedSession}
          allSessions={baseballSessions}
          pitchGoals={pitchGoals}
          onBack={() => setSelectedSession(null)}
        />
      </FullScreenLayout>
    );
  }
console.log("GOALS");
console.log(pitchGoals);
  // ---------- RENDER ----------
  return (
    <section className="home-section">
      <h3 className="section-title">Sharpen Your Stuff</h3>
      <p className="section-subtitle">
        Explore suggested throwing sessions based on your pitch mix.
      </p>

      {/* Totals vs goal selector for ring */}
      <section className="home-section">
        <div className="goals-row" style={{ marginBottom: 8 }}>
          <select
            className="goals-input black-select"
            style={{ maxWidth: 260 }}
            value={ringGoalSelection}
            onChange={(e) => setRingGoalSelection(e.target.value)}
          >
            <option value="lifetime">Lifetime goal</option>
            {baseballDatedGoals.map((g) => (
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

        {/* Single goal ring with navigation */}
        <div className="single-goal-ring-wrapper">
          <div className="goal-ring-nav">
            <button
              type="button"
              className="mode-chip"
              onClick={handlePrevRing}
            >
              ◀
            </button>

            <div className="goal-ring-card">{ringContent}</div>

            <button
              type="button"
              className="mode-chip"
              onClick={handleNextRing}
            >
              ▶
            </button>
          </div>
        </div>
      </section>

      {/* MENUS */}
      <div className="flexMenu">
        {/* ----- SET PITCHING GOALS ----- */}
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
              {/* Goal timeframe */}
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

              {/* Pitch-type specific goals (fixed 4) */}
<div className="goals-row">
  <label className="goals-label">Pitch-type Goals</label>
  <small className="goals-hint">
    Set goals for each pitch type (fixed list).
  </small>
</div>

{pitchGoals.map((pg, index) => {
        const title = pg.name;

        if (!pg.expanded) {
          return (
            <div
              key={pg.pitchType || index}
              className="exercise-card minimized"
              onClick={() => handleExpandPitchGoal(index)}
            >
              <div className="exercise-min-line">
                <span className="exercise-min-title">{title}</span>
                <span className="exercise-min-meta">
                  {pg.minutes && pg.reps
                    ? `${pg.minutes} min • ${pg.reps} throws`
                    : "Tap to edit"}
                  {pg.fastestSpeed ? ` • Top ${pg.fastestSpeed}` : ""}
                  {pg.accuracy ? ` • ${pg.accuracy}% in zone` : ""}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div key={pg.pitchType || index} className="exercise-card">
            <div
              className="exercise-card-header"
              onClick={() => toggleExpand(index, pitchGoals, setPitchGoals)}
              style={{ cursor: "pointer" }}
            >
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

            {/* Name shown but not editable */}
            <div className="goals-row">
              <label className="goals-label">Pitch Type</label>
              <div className="goals-input">{pg.name}</div>
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
                    handlePitchGoalChange(index, "fastestSpeed", e.target.value)
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
          </div>
        );
      })}

              <div className="goals-row">
                <button
                  type="submit"
                  className="goals-save-btn btn-save"
                  style={{ fontSize: "13px" }}
                >
                  Save Goals
                </button>
              </div>
            </form>
          )}
        />

        {/* ----- RECORD SESSION ----- */}
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
                    style={{ flexShrink: 0, padding: "3px" }}
                    onClick={() => {
                      setTempSessionDay(sessionDay || new Date());
                      setShowDatePicker(true);
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendar} />
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

              {/* Time Spent */}
              <div className="goals-row">
                <label className="goals-label">Time Spent</label>
                <input
                  type="text"
                  className="goals-input"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                />
              </div>

              {/* Pitch counts + videos */}
              {PITCH_TYPES.map(({ key, label }) => {
                const data = pitchData[key];
                const title = label;

                if (!data.expanded) {
                  const hasAny =
                    data.count ||
                    data.accuracy ||
                    data.maxSpeed ||
                    data.videos.length > 0;

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
                                data.maxSpeed &&
                                  `Top ${data.maxSpeed} mph`,
                                data.accuracy &&
                                  `${data.accuracy}% in zone`,
                                data.videos.length
                                  ? `${data.videos.length} video${
                                      data.videos.length > 1 ? "s" : ""
                                    }`
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
                    <div
                      className="exercise-card-header"
                      onClick={() => togglePitchExpanded(key)}
                      style={{ cursor: "pointer" }}
                    >
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
                        <label className="goals-label">
                          {label} Count
                        </label>
                        <input
                          type="text"
                          className="goals-input"
                          value={data.count}
                          onChange={(e) =>
                            handlePitchFieldChange(
                              key,
                              "count",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="goals-row">
                        <label className="goals-label">
                          Accuracy (% in zone)
                        </label>
                        <input
                          type="text"
                          className="goals-input"
                          value={data.accuracy}
                          onChange={(e) =>
                            handlePitchFieldChange(
                              key,
                              "accuracy",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="goals-row">
                        <label className="goals-label">
                          Max Speed (mph)
                        </label>
                        <input
                          type="text"
                          className="goals-input"
                          value={data.maxSpeed}
                          onChange={(e) =>
                            handlePitchFieldChange(
                              key,
                              "maxSpeed",
                              e.target.value
                            )
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
                          <div
                            className="coach-doc-pill pending"
                            style={{ width: "92%" }}
                          >
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
                              onChange={(e) =>
                                handlePitchVideosChange(key, e)
                              }
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
                <button
                  type="submit"
                  className="goals-save-btn btn-save"
                  style={{ fontSize: "13px" }}
                >
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

        // 🆕 use helper so it works for either `pitches` or `pitchData`
        const pitches = getSessionPitches(s);

        const totalPitches = Object.values(pitches).reduce(
          (sum, p) => sum + Number(p.count || 0),
          0
        );

        const maxSpeed = Object.values(pitches).reduce((max, p) => {
          const speed = Number(p.maxSpeed || 0);
          return speed > max ? speed : max;
        }, 0);

        return (
          <article
            key={s._id}
            className="session-card"
            onClick={() => setSelectedSession(s)}
          >
            <div className="session-card-info">
              <h4 className="session-title">Pitching Session — {dateStr}</h4>
            </div>

            <p className="session-description">
              {`${totalPitches} pitches thrown`}
            </p>

            <div className="session-meta">
              <span>⏱ {s.timeSpent || "N/A"} minutes </span>
              <span>
                🔥 Max Speed: {maxSpeed > 0 ? `${maxSpeed} mph` : "N/A"}
              </span>
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
