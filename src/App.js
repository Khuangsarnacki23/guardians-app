// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";
import Home from "./Home";
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route } from "react-router-dom";
import TrainingOnboarding from "./TrainingOnboarding";
import RequestOverlay from "./RequestOverlay";
import {
  SignedIn,
  SignedOut,
  SignInButton,
} from "@clerk/clerk-react";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { faCalendar, faChartArea, faChartPie, faClipboard, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function LoggedInView({ setOverlayVisible }) {
  return (
    <div className="App">
      <ToastContainer theme="dark" />

      <main className="App-main">
        <Routes>
          <Route path="/" element={<Home setOverlayVisible={setOverlayVisible} />} />
          <Route path="/coach-setup" element={<TrainingOnboarding setOverlayVisible={setOverlayVisible} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [videoUrl, setVideoUrl] = useState(null);
  const API_PORT = 5001;
  const devHost = window.location.hostname === "localhost" || window.location.hostname === "172.20.105.19" ? "172.20.105.19" : window.location.hostname;
  const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? `http://${devHost}:${API_PORT}`
    : "https://guardians-app-production.up.railway.app";
  useEffect(() => {
    async function loadVideo() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/random-guardians-highlight`);
        const data = await res.json();
        if (data.videoUrl) setVideoUrl(data.videoUrl);
      } catch (err) {
        console.error("Highlight error:", err);
      }
    }
  
    loadVideo();
  }, []);
  console.log(videoUrl);
  const [overlayVisible, setOverlayVisible] = useState(false);
  return (
    <div className="App-root">
      <RequestOverlay visible={overlayVisible} />
      <SignedOut>
  <div className="auth-hero">

    {videoUrl && (
      <video
        className="auth-hero-video"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    )}

    <div className="auth-hero-overlay" />
    <div className="auth-hero-content">
      <h1 className="auth-hero-title">MLB Training Dashboard</h1>
      <p className="auth-hero-subtitle">
        Track your bullpen work, gym sessions, and training videos in one place.
      </p>

      <div className="auth-hero-bullets">
        <span><FontAwesomeIcon icon={faChartPie }/>  Create progress rings for workout goals </span>
        <span> <FontAwesomeIcon icon={faVideo }/> Attach pitching & gym clips to evaluate form</span>
        <span><FontAwesomeIcon icon={faCalendar}/> Session history and trends for given exercises</span>
        <span> <FontAwesomeIcon icon={faClipboard} /> Set tailored goal planning with our RAG Coach AI feature </span>
      </div>

      <SignInButton mode="modal">
        <button className="button-31 auth-hero-cta btn-secondary">Sign in</button>
      </SignInButton>
    </div>
  </div>
</SignedOut>
      <SignedIn>
        
        <LoggedInView setOverlayVisible={setOverlayVisible} />
      </SignedIn>
    </div>
  );
}

export default App;
