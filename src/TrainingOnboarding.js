// TrainingOnboarding.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "./Home"; 
import "./ChatAssistant.css";
import RequestOverlay from "./RequestOverlay";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCircleCheck, faFileCirclePlus } from "@fortawesome/free-solid-svg-icons";
const LAST_STEP = 4; 

export default function TrainingOnboarding() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  const [profile, setProfile] = useState({
    level: "",
    primaryRole: "",
    handedness: "",
    pitchingSchedule: "",
    priorities: [],

    gymLevel: "",
    workoutType: "",
    trainingDays: "",

    hasInjury: null,
    injuryArea: "",
    injuryRecovery: "",
  });

  const [pendingFiles, setPendingFiles] = useState([]);   
  const [uploadedDocs, setUploadedDocs] = useState([]);   
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);         
  const [overlayVisible, setOverlayVisible] = useState(false);
const handleAddCoachFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
  
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };
  
  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };
    
useEffect(() => {
  const fetchDocs = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/coach-docs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUploadedDocs(data.documents || []);
    } catch (err) {
      console.error("Error loading coach docs:", err);
    }
  };

  fetchDocs();
}, [getToken]);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const togglePriority = (key) => {
    setProfile((prev) => {
      const exists = prev.priorities.includes(key);
      return {
        ...prev,
        priorities: exists
          ? prev.priorities.filter((p) => p !== key)
          : [...prev.priorities, key],
      };
    });
  };

  const handleFinish = async () => {
    setOverlayVisible(true);
    await delay(1000);
    try {
      const token = await getToken();

      const res = await fetch(`${API_BASE_URL}/api/training-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profile }),
      });

      if (!res.ok) {
        console.error("Failed to save training profile", res.status);
      } else {
        const data = await res.json().catch(() => null);
        if (data && data.profile) {
          setProfile((prev) => ({ ...prev, ...data.profile }));
        }
      }
      try {
        setSaving(true); 
        if (pendingFiles.length > 0) {
          setUploading(true);
          const token = await getToken();
    
          for (const file of pendingFiles) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", file.name);
    
            const res = await fetch(`${API_BASE_URL}/api/coach-docs`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
    
            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              console.error("Coach doc upload error:", res.status, errText);
              continue;
            }
    
            const data = await res.json();
            setUploadedDocs((prev) => [data.document, ...prev]);
          }
    
          setPendingFiles([]); 
        }
      } catch (err) {
        console.error("Error in Finish & Save:", err);
      } finally {
        setUploading(false);
        setSaving(false);
      }
      
      localStorage.setItem("mlbCoachProfile", JSON.stringify(profile));
      localStorage.setItem("mlbCoachOnboardingComplete", "true");
    } catch (err) {
      console.error("Error saving training profile:", err);
    }
    finally{
        setOverlayVisible(false);
        setTimeout(() => {
            navigate("/");
          }, 1000);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/training-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn("Failed to fetch training profile", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (isMounted && data.profile) {
          setProfile((prev) => ({
            ...prev,
            ...data.profile,
          }));
        }
      } catch (err) {
        console.error("Error fetching training profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [getToken]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="onboard-step">
            <h2>Let’s dial in your baseball profile</h2>
            <p className="onboard-sub">
              This helps match the training advice to where and how you play.
            </p>

            <h3 className="onboard-question">What level describes you?</h3>
            <div className="onboard-chip-row">
              {[
                { key: "youth", label: "Youth (10–13)" },
                { key: "hs", label: "High School" },
                { key: "college", label: "College" },
                { key: "adult", label: "Adult / Rec" },
                { key: "pro", label: "Pro / Indy" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.level === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("level", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <h3 className="onboard-question">What is your primary role?</h3>
            <div className="onboard-chip-row">
              {[
                { key: "SP", label: "Starting Pitcher" },
                { key: "RP", label: "Relief Pitcher" },
                { key: "two_way", label: "Two-way Player" },
                { key: "position", label: "Position Player" },
                { key: "strength_only", label: "Strength / Gym Focused" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.primaryRole === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("primaryRole", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <h3 className="onboard-question">Which hand do you throw with?</h3>
            <div className="onboard-chip-row">
              {[
                { key: "RHP", label: "Right-handed" },
                { key: "LHP", label: "Left-handed" },
                { key: "NA", label: "Not a pitcher" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.handedness === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("handedness", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="onboard-step">
            <h2>Pitching schedule & focus</h2>
            <p className="onboard-sub">
              I’ll keep workload and in-game suggestions aligned with your load.
            </p>

            <h3 className="onboard-question">
              What best describes your pitching schedule?
            </h3>
            <div className="onboard-chip-row">
              {[
                { key: "offseason_light", label: "Off-season, light throwing" },
                { key: "offseason_build", label: "Off-season, building up" },
                { key: "inseason_1x", label: "In-season, ~1 outing/week" },
                { key: "inseason_2x", label: "In-season, 2+ outings/week" },
                { key: "bullpens_only", label: "Mostly bullpens / practice" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.pitchingSchedule === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("pitchingSchedule", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <h3 className="onboard-question">
              What are your top priorities right now? (pick a few)
            </h3>
            <div className="onboard-chip-row onboard-chip-row-wrap">
              {[
                { key: "velocity", label: "Increase Velocity" },
                { key: "command", label: "Improve Command" },
                { key: "recovery", label: "Recover Faster / Less Soreness" },
                { key: "durability", label: "Durability / Stay Healthy" },
                { key: "pitch_design", label: "Pitch Shape / Movement" },
                {
                  key: "situational",
                  label: "Situational Awareness / Decisions",
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.priorities.includes(opt.key) ? "active" : ""
                  }`}
                  onClick={() => togglePriority(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="onboard-step">
            <h2>Strength training context</h2>
            <p className="onboard-sub">
              This helps me tailor volume and exercise selection.
            </p>

            <h3 className="onboard-question">
              How experienced are you in the gym?
            </h3>
            <div className="onboard-chip-row">
              {[
                { key: "beginner", label: "Beginner" },
                { key: "intermediate", label: "Intermediate" },
                { key: "advanced", label: "Advanced" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.gymLevel === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("gymLevel", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <h3 className="onboard-question">
              What best describes your typical workout style?
            </h3>
            <div className="onboard-chip-row onboard-chip-row-wrap">
              {[
                { key: "calisthenics", label: "Calisthenics / Bodyweight" },
                { key: "ppl", label: "PPL (Push/Pull/Legs)" },
                {
                  key: "pitching_focused",
                  label: "Pitching-focused Strength / Power",
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.workoutType === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("workoutType", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <h3 className="onboard-question">
              How many days per week can you realistically train?
            </h3>
            <div className="onboard-chip-row">
              {[
                { key: "2", label: "2 days" },
                { key: "3", label: "3 days" },
                { key: "4", label: "4 days" },
                { key: "5_plus", label: "5+ days" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`mode-chip ${
                    profile.trainingDays === opt.key ? "active" : ""
                  }`}
                  onClick={() => updateField("trainingDays", opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
      default:
        return (
          <div className="onboard-step">
            <h2>Recent injuries or limitations</h2>
            <p className="onboard-sub">
              I’m not a doctor, but I can steer workload and exercises around
              what’s bugging you.
            </p>

            <h3 className="onboard-question">
              Any recent injuries or pain affecting training?
            </h3>
            <div className="onboard-chip-row">
              <button
                type="button"
                className={`mode-chip ${
                  profile.hasInjury === false ? "active" : ""
                }`}
                onClick={() => updateField("hasInjury", false)}
              >
                No, feeling good
              </button>
              <button
                type="button"
                className={`mode-chip ${
                  profile.hasInjury === true ? "active" : ""
                }`}
                onClick={() => updateField("hasInjury", true)}
              >
                Yes, something’s bugging me
              </button>
            </div>

            {profile.hasInjury && (
              <>
                <h3 className="onboard-question">
                  Which motion or muscle is affected?
                </h3>
                <textarea
                  className="onboard-textarea"
                  value={profile.injuryArea}
                  onChange={(e) => updateField("injuryArea", e.target.value)}
                />

                <h3 className="onboard-question">
                  What’s your expected recovery / plan right now?
                </h3>
                <textarea
                  className="onboard-textarea"
                  value={profile.injuryRecovery}
                  onChange={(e) =>
                    updateField("injuryRecovery", e.target.value)
                  }
                />
              </>
            )}
          </div>
        );
        case 4:
            return(
                <section className="onboarding-section">
                <RequestOverlay visible={overlayVisible} />
                <h2 className="onboarding-title">Upload coach resources </h2>
                <p className="onboarding-subtitle">
                  You can add notes from coaches, rehab protocols, or training docs. These
                  will only be uploaded and indexed when you press <strong>Finish &amp; Save</strong>.
                </p>
              
                <div className="upload-row">
                <label className="upload-btn">
                    Upload Files
                    <input
                        type="file"
                        multiple
                        accept=".txt,.md,.json,.yml,.yaml"
                        onChange={handleAddCoachFiles}
                />
</label>
                </div>
                {pendingFiles.length > 0 && (
                  <div className="pending-docs-list">
                    <h4>Will be uploaded on Finish:</h4>
                    <div className="doc-pill-row">
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="coach-doc-pill pending">
                          <span className="coach-doc-pill-icon">
                          <FontAwesomeIcon icon={faFileCirclePlus} />
                          </span>
                          <span className="coach-doc-pill-name">{file.name}</span>
                          <button
                            type="button"
                            className="coach-doc-pill-remove"
                            onClick={() => removePendingFile(idx)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uploadedDocs.length > 0 && (
                  <div className="uploaded-docs-list">
                    <h4>Already uploaded</h4>
                    <div className="doc-pill-row">
                      {uploadedDocs.map((doc) => (
                        <div key={doc._id} className="coach-doc-pill uploaded">
                          <span className="coach-doc-pill-icon">
                          <FontAwesomeIcon icon={faFileCircleCheck} />
                          </span>
                          <span className="coach-doc-pill-name">
                            {doc.title || doc.originalFilename}
                          </span>
                          <span className="coach-doc-pill-meta">
                            {Math.round((doc.sizeBytes || 0) / 1024)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )
    }
  };

  const handleNext = () => {
    if (step < LAST_STEP) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <button
          className="onboarding-close"
          type="button"
          onClick={() => navigate("/")}
        >
          ✕
        </button>
      </header>

      <main className="onboarding-main">{renderStep()}</main>

      <footer className="onboarding-footer">
        <div className="onboard-progress-pills">
          {Array.from({ length: LAST_STEP + 1 }).map((_, i) => (
            <span
              key={i}
              className={`onboard-pill ${
                i === step ? "onboard-pill-active" : i < step ? "onboard-pill-complete" : ""
              }`}
            />
          ))}
        </div>
        <div className="onboard-nav-buttons-row">
          {step > 0 ? (
            <button
              type="button"
              className="onboard-back-link"
              onClick={handleBack}
            >
              Back
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            className="onboard-primary-btn"
            onClick={(e) => {
                e.preventDefault();
                e.currentTarget.blur();
                step === LAST_STEP ? handleFinish() : handleNext();
              }}
          >
            {step === LAST_STEP ? "Finish & Save" : "Continue"}
          </button>
          <span />
        </div>
      </footer>
    </div>
  );
}
