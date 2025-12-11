import React from "react";
import "./RequestOverlay.css";

export default function RequestOverlay({ visible }) {
  return (
    <div>
    <div className = {`background-overlay ${visible ? "visible" : "" }`}> </div>
    <div className={`request-overlay ${visible ? "visible" : ""}`}>
      <div className="spinner" />
    </div>
    </div>
  );
}
