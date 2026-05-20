import React, { useEffect, useState, useRef } from "react";

const EMOTIONS = ["neutral","happy","sad","angry","fearful","disgusted","surprised"];
const MAX_HISTORY = 40;
const COLORS = {
  neutral: "#94a3b8", happy: "#00ff96", sad: "#60a5fa",
  angry: "#f87171", fearful: "#c084fc", disgusted: "#fb923c", surprised: "#fbbf24",
};

function LiveDashboard() {
  const [currentEmotions, setCurrentEmotions] = useState({});
  const [history, setHistory] = useState([]);
  const [dominant, setDominant] = useState("-");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      console.log("Dashboard: Connecting to WebSocket...");
      const ws = new WebSocket("ws://localhost:5000");
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("Dashboard: WebSocket Connected ✅");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          console.log("Dashboard: Raw data received:", event.data);
          const data = JSON.parse(event.data);
          console.log("Dashboard: Parsed data:", data);

          if (data.expressions) {
            setCurrentEmotions(data.expressions);
            setDominant(data.dominant || "-");
            setHistory((prev) => {
              const updated = [...prev, { ...data.expressions, time: Date.now() }];
              return updated.length > MAX_HISTORY ? updated.slice(-MAX_HISTORY) : updated;
            });
          }
        } catch (err) {
          console.error("Dashboard: Parse error:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("Dashboard: WebSocket error:", err);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log("Dashboard: WebSocket closed, reconnecting in 2s...");
        setConnected(false);
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => socketRef.current?.close();
  }, []);

  return (
    <div className="dashboard-page">
      <h2 className="page-title">📊 Analytics Dashboard</h2>

      {/* Connection Status */}
      <div style={{
        display: "inline-block", padding: "6px 14px", borderRadius: "20px", fontSize: "0.8rem",
        marginBottom: "20px",
        background: connected ? "rgba(0,255,150,0.1)" : "rgba(248,113,113,0.1)",
        border: `1px solid ${connected ? "#00ff96" : "#f87171"}`,
        color: connected ? "#00ff96" : "#f87171"
      }}>
        {connected ? "🟢 WebSocket Connected" : "🔴 Connecting..."}
      </div>

      <div className="dominant-emotion">
        <div className="dominant-label">CURRENT DOMINANT EMOTION</div>
        <div className="dominant-value">{dominant.toUpperCase()}</div>
      </div>

      {/* Live Bars */}
      <div className="emotion-container">
        <div className="emotion-title">Live Emotion Levels</div>
        {EMOTIONS.map((e) => (
          <div className="emotion-row" key={e}>
            <div className="emotion-label">{e}</div>
            <div className="emotion-bar-bg">
              <div className="emotion-bar-fill" style={{
                width: `${((currentEmotions[e] || 0) * 100).toFixed(1)}%`,
                background: `linear-gradient(90deg, ${COLORS[e]}, #00c8ff)`,
              }} />
            </div>
            <div className="emotion-percent">
              {((currentEmotions[e] || 0) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* History Graph */}
      <div className="emotion-container" style={{ marginTop: "24px" }}>
        <div className="emotion-title">Emotion History Graph</div>
        {history.length < 2 ? (
          <p style={{ opacity: 0.5, fontSize: "0.85rem", padding: "20px 0" }}>
            Waiting for emotion data from Live Camera tab...
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <svg width={Math.max(history.length * 18, 600)} height={200}
              style={{ display: "block" }}>
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <line key={v} x1={0} y1={190 - v * 180}
                  x2={Math.max(history.length * 18, 600)} y2={190 - v * 180}
                  stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              ))}
              {EMOTIONS.map((emotion) => {
                const d = history
                  .map((snap, i) =>
                    `${i === 0 ? "M" : "L"} ${i * 18 + 9} ${190 - (snap[emotion] || 0) * 180}`)
                  .join(" ");
                return (
                  <path key={emotion} d={d} stroke={COLORS[emotion]}
                    strokeWidth={2} fill="none" opacity={0.85} />
                );
              })}
            </svg>
          </div>
        )}

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "12px" }}>
          {EMOTIONS.map((e) => (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS[e] }} />
              <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LiveDashboard;