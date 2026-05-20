import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

const SUSPICIOUS_EMOTIONS = ["angry", "fearful", "disgusted", "sad"];
const MAX_WARNINGS = 3;
const EMOTION_THRESHOLD = 0.4;
const NO_FACE_TIMEOUT = 3000;

function ExamPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const warningCountRef = useRef(0);
  const lastWarningTime = useRef(0);
  const noFaceStartTime = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [warningLog, setWarningLog] = useState([]);
  const [terminated, setTerminated] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [dominant, setDominant] = useState("-");
  const [faceStatus, setFaceStatus] = useState("Waiting...");

  // Step 1 — Load Models
  useEffect(() => {
    const load = async () => {
      try {
        console.log("ExamPage: Loading models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models/tiny_face_detector");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models/face_landmark_68");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models/face_expression");
        console.log("ExamPage: Models loaded ✅");
        setModelsLoaded(true);
      } catch (err) {
        console.error("ExamPage: Model load error:", err);
      }
    };
    load();
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Step 2 — Start Camera
  useEffect(() => {
    if (!examStarted || !modelsLoaded) return;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
          };
        }
      } catch (err) {
        alert("Camera access denied. Please allow camera permissions and refresh.");
      }
    };
    startCamera();
  }, [examStarted, modelsLoaded]);

  // Step 3 — Detection
  useEffect(() => {
    if (!cameraReady || terminated) return;

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const dims = faceapi.matchDimensions(canvas, video, true);
        const resized = faceapi.resizeResults(detections, dims);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
        faceapi.draw.drawFaceExpressions(canvas, resized);

        const now = Date.now();
        const cooldownOk = now - lastWarningTime.current > 5000;

        // ── CHECK 1: NO FACE ──
        if (detections.length === 0) {
          setFaceStatus("⚠️ No face detected");
          setDominant("-");
          if (noFaceStartTime.current === null) {
            noFaceStartTime.current = now;
          } else if (now - noFaceStartTime.current > NO_FACE_TIMEOUT && cooldownOk) {
            lastWarningTime.current = now;
            noFaceStartTime.current = null;
            issueWarning("NO FACE DETECTED", "Student looked away or left the frame for more than 3 seconds.");
          }
          return;
        }

        noFaceStartTime.current = null;

        // ── CHECK 2: MULTIPLE FACES ──
        if (detections.length > 1) {
          setFaceStatus(`🚨 ${detections.length} faces detected`);
          if (cooldownOk) {
            lastWarningTime.current = now;
            issueWarning("MULTIPLE FACES", `${detections.length} faces detected in frame. Possible cheating.`);
          }
          return;
        }

        // ── CHECK 3: LOOKING AWAY ──
        const landmarks = detections[0].landmarks;
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
        const noseTipX = nose[3].x;
        const faceWidth = Math.abs(rightEye[3].x - leftEye[0].x);
        const horizontalOffset = Math.abs(noseTipX - eyeMidX) / faceWidth;

        if (horizontalOffset > 0.35 && cooldownOk) {
          setFaceStatus("⚠️ Looking away");
          lastWarningTime.current = now;
          issueWarning("LOOKING AWAY", "Student's head turned significantly away from the screen.");
          return;
        }

        // ── CHECK 4: SUSPICIOUS EMOTIONS ──
        const expr = detections[0].expressions;
        const dom = Object.entries(expr).reduce((a, b) => a[1] > b[1] ? a : b);
        setDominant(dom[0]);
        setFaceStatus("✅ Face detected");

        const suspicious = SUSPICIOUS_EMOTIONS.find((e) => expr[e] > EMOTION_THRESHOLD);
        if (suspicious && cooldownOk) {
          lastWarningTime.current = now;
          issueWarning(
            `SUSPICIOUS EMOTION: ${suspicious.toUpperCase()}`,
            `Detected ${suspicious} at ${(expr[suspicious] * 100).toFixed(1)}% confidence.`
          );
        }

      } catch (err) {
        console.log("Detection error:", err);
      }
    }, 300);

    return () => clearInterval(intervalRef.current);
  }, [cameraReady, terminated]);

  // ── PLAY ALARM ──
  const playAlarm = (isCritical = false) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const frequencies = isCritical
        ? [880, 660, 880, 660, 880]
        : [520, 440];

      let time = ctx.currentTime;

      frequencies.forEach((freq) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = isCritical ? "sawtooth" : "sine";
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.4, time + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, time + 0.25);
        oscillator.start(time);
        oscillator.stop(time + 0.25);
        time += 0.3;
      });
    } catch (err) {
      console.log("Audio error:", err);
    }
  };

  // ── ISSUE WARNING ──
  const issueWarning = (type, detail) => {
    warningCountRef.current += 1;
    const count = warningCountRef.current;
    setWarnings(count);

    const logEntry = {
      id: count,
      type,
      detail,
      time: new Date().toLocaleTimeString(),
    };

    setWarningLog((prev) => [...prev, logEntry]);

    if (count >= MAX_WARNINGS) {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTerminated(true);
      setAlertMessage("🚨 EXAM TERMINATED — Maximum warnings reached.");
      setShowAlert(true);
      playAlarm(true);
    } else {
      const remaining = MAX_WARNINGS - count;
      setAlertMessage(
        `⚠️ Warning ${count}/${MAX_WARNINGS} — ${type}. ${remaining} warning(s) remaining before termination!`
      );
      setShowAlert(true);
      playAlarm(false);
      setTimeout(() => setShowAlert(false), 5000);
    }
  };

  const handleRestart = () => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    warningCountRef.current = 0;
    lastWarningTime.current = 0;
    noFaceStartTime.current = null;
    setTerminated(false);
    setExamStarted(false);
    setCameraReady(false);
    setWarnings(0);
    setWarningLog([]);
    setDominant("-");
    setFaceStatus("Waiting...");
    setShowAlert(false);
    setAlertMessage("");
  };

  // ── TERMINATED SCREEN ──
  if (terminated) {
    return (
      <div className="exam-terminated">
        <div className="terminated-icon">🚨</div>
        <h2>SESSION TERMINATED</h2>
        <p>Your session was ended due to repeated violations.</p>

        <div style={{
          marginTop: "24px", width: "100%", maxWidth: "500px",
          background: "rgba(255,50,50,0.05)", border: "1px solid rgba(255,50,50,0.2)",
          borderRadius: "12px", padding: "20px", textAlign: "left"
        }}>
          <div style={{ fontFamily: "var(--text-mono)", fontSize: "0.65rem",
            letterSpacing: "3px", color: "#f87171", marginBottom: "12px" }}>
            VIOLATION LOG
          </div>
          {warningLog.map((w) => (
            <div key={w.id} style={{
              padding: "10px 0", borderBottom: "1px solid rgba(255,50,50,0.1)", fontSize: "0.85rem"
            }}>
              <div style={{ color: "#fca5a5", fontWeight: 600 }}>
                [{w.time}] Warning {w.id} — {w.type}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "3px" }}>
                {w.detail}
              </div>
            </div>
          ))}
        </div>

        <button className="start-btn" style={{ marginTop: "30px", maxWidth: "300px" }}
          onClick={handleRestart}>
          ↺ RESTART SESSION
        </button>
      </div>
    );
  }

  // ── START SCREEN ──
  if (!examStarted) {
    return (
      <div className="exam-start-screen">
        <div className="exam-start-card">
          <h2>⬡ EXAMINATION MODE</h2>
          <p>Your webcam will monitor your behaviour throughout the session.</p>
          <ul className="exam-rules">
            <li>✅ Keep your face clearly visible</li>
            <li>✅ Look directly at the screen</li>
            <li>🚫 Do not look away for more than 3 seconds</li>
            <li>🚫 No other faces allowed in frame</li>
            <li>⚠️ Maximum <strong>{MAX_WARNINGS} warnings</strong> before termination</li>
          </ul>
          <button className="start-btn danger" onClick={() => setExamStarted(true)} disabled={!modelsLoaded}>
            {modelsLoaded ? "▶ INITIATE SESSION" : "⏳ LOADING SYSTEMS..."}
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE EXAM SCREEN ──
  return (
    <div className="exam-active">
      <div className="page-title">⬡ ACTIVE MONITORING SESSION</div>

      {showAlert && (
        <div className={`warning-alert ${warnings >= MAX_WARNINGS ? "alert-critical" : ""}`}>
          {alertMessage}
        </div>
      )}

      <div className="exam-layout">
        {/* Camera */}
        <div style={{ flex: 1 }}>
          {!cameraReady && <p className="loading-text">📷 Starting camera...</p>}
          <div className="camera-wrapper">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <canvas ref={canvasRef} className="camera-canvas" />
          </div>
        </div>

        {/* Side Panel */}
        <div className="side-card" style={{ minWidth: "240px" }}>
          <div className="side-title">SESSION STATUS</div>
          <div className="side-item">
            Face: <strong style={{ color: faceStatus.startsWith("✅") ? "var(--accent-teal)" : "#f87171" }}>
              {faceStatus}
            </strong>
          </div>
          <div className="side-item">
            Emotion: <strong style={{ color: "var(--accent-cyan)" }}>{dominant}</strong>
          </div>
          <div className="side-item">
            Warnings:{" "}
            <strong style={{ color: warnings > 0 ? "#f87171" : "var(--accent-teal)" }}>
              {warnings}/{MAX_WARNINGS}
            </strong>
          </div>

          <div style={{ marginTop: "20px" }}>
            <div className="side-title">WARNING METER</div>
            {[...Array(MAX_WARNINGS)].map((_, i) => (
              <div key={i} style={{
                width: "100%", height: "8px", borderRadius: "4px",
                background: i < warnings
                  ? "linear-gradient(90deg,#f87171,#ff4444)"
                  : "rgba(0,200,255,0.08)",
                marginBottom: "8px",
                border: "1px solid rgba(0,200,255,0.1)",
                transition: "background 0.4s ease",
                boxShadow: i < warnings ? "0 0 10px rgba(248,113,113,0.5)" : "none",
              }} />
            ))}
          </div>

          {warningLog.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div className="side-title">VIOLATION LOG</div>
              {warningLog.map((w) => (
                <div key={w.id} style={{
                  fontSize: "0.75rem", fontFamily: "var(--text-mono)",
                  color: "#fca5a5", padding: "6px 0",
                  borderBottom: "1px solid rgba(255,50,50,0.1)", lineHeight: 1.5
                }}>
                  [{w.time}]<br />{w.type}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "16px", fontSize: "0.7rem",
            fontFamily: "var(--text-mono)", color: "var(--text-secondary)", lineHeight: 1.8 }}>
            MONITORING ACTIVE<br />
            NO-FACE TIMEOUT: 3s<br />
            COOLDOWN: 5s<br />
            INTERVAL: 300ms
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamPage;