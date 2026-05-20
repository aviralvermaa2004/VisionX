import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

const EMOTIONS = ["neutral","happy","sad","angry","fearful","disgusted","surprised"];

function WebcamFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);
  const [emotions, setEmotions] = useState({});
  const [dominant, setDominant] = useState({ emotion: "-", score: 0 });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Connect WebSocket
  useEffect(() => {
    try {
      socketRef.current = new WebSocket("ws://localhost:5000");
    } catch (e) {
      console.log("WebSocket failed:", e);
    }
    return () => socketRef.current?.close();
  }, []);

  // Step 2 — Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models/tiny_face_detector");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models/face_landmark_68");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models/face_expression");
        console.log("Models loaded ✅");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model load error:", err);
        setError("Failed to load AI models: " + err.message);
      }
    };
    loadModels();
  }, []);

  // Step 3 — Start Camera after models load
  useEffect(() => {
    if (!modelsLoaded) return;

    const startCamera = async () => {
      try {
        console.log("Starting camera...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            console.log("Camera started ✅");
            setCameraReady(true);
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access denied. Please allow camera permissions and refresh.");
      }
    };

    startCamera();
  }, [modelsLoaded]);

  // Step 4 — Start Detection after camera is ready
  useEffect(() => {
    if (!cameraReady) return;

    console.log("Starting detection...");

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

        if (detections.length > 0) {
          const expr = detections[0].expressions;
          setEmotions(expr);
          const dom = Object.entries(expr).reduce((a, b) => a[1] > b[1] ? a : b);
          setDominant({ emotion: dom[0], score: (dom[1] * 100).toFixed(1) });

          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              expressions: expr,
              dominant: dom[0]
            }));
          }
        }
      } catch (err) {
        console.log("Detection error:", err);
      }
    }, 200);

    return () => clearInterval(intervalRef.current);
  }, [cameraReady]);

  return (
    <div className="webcam-page">
      {/* Status Messages */}
      {!modelsLoaded && !error && (
        <p className="loading-text">⏳ Loading AI Models, please wait...</p>
      )}
      {modelsLoaded && !cameraReady && !error && (
        <p className="loading-text">📷 Starting camera...</p>
      )}
      {error && (
        <p style={{ color: "#f87171", textAlign: "center", padding: "20px" }}>
          ❌ {error}
        </p>
      )}

      {/* Camera */}
      <div className="camera-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <canvas ref={canvasRef} className="camera-canvas" />
      </div>

      {/* Dominant Emotion */}
      {dominant.emotion !== "-" && (
        <div className="dominant-emotion">
          <div className="dominant-label">DOMINANT EMOTION</div>
          <div className="dominant-value">{dominant.emotion.toUpperCase()}</div>
          <div className="dominant-percent">{dominant.score}%</div>
        </div>
      )}

      {/* Emotion Bars */}
      <div className="emotion-container">
        <div className="emotion-title">Live Emotion Breakdown</div>
        {EMOTIONS.map((e) => (
          <div className="emotion-row" key={e}>
            <div className="emotion-label">{e}</div>
            <div className="emotion-bar-bg">
              <div
                className="emotion-bar-fill"
                style={{ width: `${((emotions[e] || 0) * 100).toFixed(1)}%` }}
              />
            </div>
            <div className="emotion-percent">
              {((emotions[e] || 0) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WebcamFeed;