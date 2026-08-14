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

const FALLBACK_DEV_API = "http://localhost:5001";

// In production the API is served from /api on the same Vercel domain, so an
// empty base means same-origin requests and CORS never comes into play.
export const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? process.env.REACT_APP_API_BASE_URL || FALLBACK_DEV_API
    : "";

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

  // Uploads one file straight to S3 using a short-lived presigned URL and
  // returns the resulting object key. The bytes never pass through the API,
  // which is what keeps us under Vercel's 4.5MB serverless request body limit.
  const uploadVideoToS3 = async (file, { kind, pitchType, token }) => {
    const signRes = await fetch(`${API_BASE_URL}/api/uploads/sign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind,
        pitchType,
        filename: file.name,
        contentType: file.type || "video/mp4",
        size: file.size,
      }),
    });

    if (!signRes.ok) {
      const { error } = await signRes.json().catch(() => ({}));
      throw new Error(error || "Could not prepare the video upload");
    }

    const { url, key } = await signRes.json();

    const putRes = await fetch(url, {
      method: "PUT",
      // Must match the ContentType the URL was signed with, or S3 rejects it.
      headers: { "Content-Type": file.type || "video/mp4" },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`Upload failed for ${file.name}`);
    }

    return key;
  };

  const uploadSessionToApi = async (sessionPayload, gymExercises = []) => {
    const token = await getToken();

    const body = {
      kind: sessionPayload.kind,
      date: sessionPayload.date,
      sessionType: sessionPayload.sessionType,
      timeSpent: sessionPayload.timeSpent,
    };

    if (sessionPayload.kind === "gym") {
      body.exercises = await Promise.all(
        gymExercises.map(async (ex) => {
          const { video, ...rest } = ex;
          if (!video) return rest;

          const videoKey = await uploadVideoToS3(video, { kind: "gym", token });
          return { ...rest, videoKey };
        })
      );
    } else if (sessionPayload.kind === "baseball") {
      const pitchData = sessionPayload.pitchData || {};
      body.totalPitches = sessionPayload.totalPitches ?? "";
      body.pitchData = {};

      await Promise.all(
        Object.entries(pitchData).map(async ([pitchType, data]) => {
          const { videos, ...rest } = data;

          const videoKeys = await Promise.all(
            (videos || []).map((file) =>
              uploadVideoToS3(file, { kind: "pitching", pitchType, token })
            )
          );

          body.pitchData[pitchType] = { ...rest, videoKeys };
        })
      );
    }

    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to upload session");

    const data = await res.json();
    setSessions((prev) => [...prev, data.session]);
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
