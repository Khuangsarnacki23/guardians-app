// ChatAssistant.jsx
import React, { useState } from "react";
import "./ChatAssistant.css";
import { API_BASE_URL } from "./Home"; 
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
export default function ChatAssistant({ onClose }) {
    const navigate = useNavigate();
    const { getToken } = useAuth();
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hey! How can I help with your training today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const handleOpenSettings = () => {
    if (onClose) onClose();
    navigate("/coach-setup");
  };
  const handleSend = async (e) => {
    e.preventDefault();
    console.log(input);
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = { from: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
    console.log(trimmed);
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/assistant/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("Assistant error:", res.status, errText);

        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text:
              "Sorry, I had trouble answering that. Please try again in a moment.",
          },
        ]);
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: data.answer || "(No answer returned.)" },
        ]);
      }
    } catch (err) {
      console.error("Network error calling assistant:", err);
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text:
            "I ran into a network issue. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-assistant-overlay fullscreen">
      <div className="chat-assistant-panel chat-assistant-panel-full">
        <header className="chat-assistant-header">
          <h4>Training Assistant</h4>
          <button
            type="button"
            className="chat-assistant-settings-btn"
            onClick={handleOpenSettings}
          >
            Coach Setup
          </button>
          <button className="chat-assistant-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="chat-assistant-messages">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`chat-message ${
                m.from === "user" ? "chat-message-user" : "chat-message-bot"
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="chat-message chat-message-bot">
              Thinking about your training…
            </div>
          )}
        </div>

        <form className="chat-assistant-input-row" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ask about your workouts or pitching..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
