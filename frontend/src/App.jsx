import React, { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import WebcamFeed from "./components/WebcamFeed";
import LiveDashboard from "./components/LiveDashboard";
import ExamPage from "./pages/ExamPage";
import SplashScreen from "./components/SplashScreen";
import "./App.css";

function App() {
  const location = useLocation();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <div className="app-shell animate-in">
      <aside className="sidebar">
        <div className="logo-block">
          <div className="logo">VISION<span>-X</span></div>
          <div className="tagline">// AI EMOTION INTELLIGENCE</div>
        </div>

        <div className="sidebar-divider" />
        <div className="nav-label">NAVIGATION</div>

        <Link to="/" style={{ textDecoration: "none" }}>
          <button className={`nav-btn ${location.pathname === "/" ? "active" : ""}`}>
            <span className="btn-icon">◉</span> Live Camera
          </button>
        </Link>

        <Link to="/dashboard" style={{ textDecoration: "none" }}>
          <button className={`nav-btn ${location.pathname === "/dashboard" ? "active" : ""}`}>
            <span className="btn-icon">▦</span> Analytics Dashboard
          </button>
        </Link>

        <div className="sidebar-divider" />
        <div className="nav-label">MONITORING</div>

        <Link to="/exam" style={{ textDecoration: "none" }}>
          <button className={`nav-btn exam-btn ${location.pathname === "/exam" ? "active" : ""}`}>
            <span className="btn-icon">⬡</span> Examination Mode
          </button>
        </Link>

        <div className="sidebar-footer">
          <div><span className="status-dot" />SYSTEM ONLINE</div>
          <div style={{ marginTop: "6px" }}>v1.0.0 · VISION-X</div>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<WebcamFeed />} />
          <Route path="/dashboard" element={<LiveDashboard />} />
          <Route path="/exam" element={<ExamPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;