// Home.js
import "./Home.css";
import "./App.css";
import React, { useEffect, useState } from "react";
import { useUser, useAuth, UserButton } from "@clerk/clerk-react";
import GymDashboard from "./GymDashboard";
import PitchingDashboard from "./PitchingDashboard";
import gymBackground from "./images/gym-background.jpg";
import pitchingBackground from "./images/baseball-background.jpg";
import { useNavigate } from "react-router-dom";
import ChatAssistant from "./ChatAssistant";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard } from "@fortawesome/free-regular-svg-icons";

const API_PORT = 5001;
const devHost = window.location.hostname === "localhost";

const FALLBACK_DEV_API = "http://localhost:5001";

export const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? process.env.REACT_APP_API_BASE_URL || FALLBACK_DEV_API
    : "https://guardians-app-production.up.railway.app";

function Home({setOverlayVisible}) {
  const [mode, setMode] = useState("gym"); 
  const [sessions, setSessions] = useState([]);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [showAssistant, setShowAssistant] = useState(false);
  const handleAssistantClick = () => {
    const hasCompleted =
      localStorage.getItem("mlbCoachOnboardingComplete") === "true";

    if (!hasCompleted) {
      navigate("/coach-setup");
    } else {
      setShowAssistant(true);
    }
  };

  useEffect(() => {
    const loadSessions = async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(data.sessions || []);
    };
    loadSessions();
  }, [getToken]);

  const uploadSessionToApi = async (sessionPayload, gymExercises = []) => {
    const formData = new FormData();
    const token = await getToken();
  
    formData.append("kind", sessionPayload.kind);
    formData.append("date", sessionPayload.date);
    formData.append("sessionType", sessionPayload.sessionType);
    formData.append("timeSpent", sessionPayload.timeSpent);
  
    if (sessionPayload.kind === "gym") {
      formData.append("exercises", JSON.stringify(gymExercises));
      gymExercises.forEach((ex, idx) => {
        if (ex.video) {
          formData.append(`exerciseVideo_${idx}`, ex.video);
        }
      });
    } else if (sessionPayload.kind === "baseball") {
      const pitchData = sessionPayload.pitchData || {};
      formData.append("pitchData", JSON.stringify(pitchData));
      formData.append("totalPitches", sessionPayload.totalPitches ?? "");
  
      Object.entries(pitchData).forEach(([pitchType, data]) => {
        (data.videos || []).forEach((file, idx) => {
          formData.append(`pitchVideo_${pitchType}_${idx}`, file);
        });
      });
    }
  
    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  
    if (!res.ok) throw new Error("Failed to upload session");
  
    const data = await res.json();
    setSessions(prev => [...prev, data.session]);
    return data;
  };
  
  

  const gymSessions = sessions.filter((s) => s.kind === "gym");
  const pitchingSessions = sessions.filter((s) => s.kind === "baseball");

  return (
    <div className="home">
      <div className = "bannerBar" style = {{  position: "relative",
    overflow: "hidden"
    }}>
      {mode == "gym" ? <img src={gymBackground} className="backgroundSessions" alt="" /> : <img src={pitchingBackground} className="backgroundSessions" alt="" /> }
      <header className="top-bar">
        <div className="top-bar-left">
          <h2 className="app-title">MLB Training Dashboard</h2>
        </div>
        <div className="top-bar-right">
          <UserButton />
        </div>
      </header>

      <header className="home-header">
        <h2 className="home-title">
          {mode === "gym" ? "Gym Sessions" : "Pitching Sessions"}
        </h2>
        <p className="home-subtitle">
          {mode === "gym"
            ? "Track and refine your strength work."
            : "Dial in your pitch mix and workload."}
        </p>
      </header>

      <div className="mode-toggle">
        <button
          className={`mode-chip ${mode === "gym" ? "active" : ""}`}
          onClick={() => setMode("gym")}
        >
          Gym
        </button>
        <button
          className={`mode-chip ${mode === "pitching" ? "active" : ""}`}
          onClick={() => setMode("pitching")}
        >
          Pitching
        </button>
      </div>
      </div>
      {mode === "gym" ? (
        <GymDashboard
          setOverlayVisible={setOverlayVisible}
          sessions={gymSessions}
          uploadSessionToApi={uploadSessionToApi}
          apiBaseUrl={API_BASE_URL}
        />
      ) : (
        <PitchingDashboard
          setOverlayVisible={setOverlayVisible}
          sessions={pitchingSessions}
          uploadSessionToApi={uploadSessionToApi}
          apiBaseUrl={API_BASE_URL}
        />
      )}
       {/* Sticky assistant button */}
       <button
          className="assistant-fab"
          onClick={handleAssistantClick}
        >
          <FontAwesomeIcon icon={faClipboard} />
          Ask Coach AI
        </button>

        {showAssistant && (
          <ChatAssistant onClose={() => setShowAssistant(false)} />
        )}
    </div>
  );
}

export default Home;
