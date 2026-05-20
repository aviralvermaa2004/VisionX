import React, { useEffect, useRef, useState } from "react";

function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING SYSTEMS");
  const [fadeOut, setFadeOut] = useState(false);
  const audioCtxRef = useRef(null);

  const playDigitalSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const notes = [220, 330, 440, 550, 660, 880, 1100, 880, 660, 1320];
      let time = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = "bandpass";
        filter.frequency.value = freq;
        filter.Q.value = 8;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.type = i % 2 === 0 ? "square" : "sawtooth";
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.12);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.start(time);
        osc.stop(time + 0.2);

        time += 0.13;
      });

      // Final deep boot tone
      const bootOsc = ctx.createOscillator();
      const bootGain = ctx.createGain();
      bootOsc.connect(bootGain);
      bootGain.connect(ctx.destination);
      bootOsc.type = "sine";
      bootOsc.frequency.setValueAtTime(80, time);
      bootOsc.frequency.linearRampToValueAtTime(220, time + 0.4);
      bootGain.gain.setValueAtTime(0, time);
      bootGain.gain.linearRampToValueAtTime(0.15, time + 0.1);
      bootGain.gain.linearRampToValueAtTime(0, time + 0.5);
      bootOsc.start(time);
      bootOsc.stop(time + 0.6);

    } catch (e) {
      console.log("Audio error:", e);
    }
  };

  useEffect(() => {
    playDigitalSound();

    const stages = [
      { at: 300,  pct: 15,  text: "LOADING AI MODELS" },
      { at: 900,  pct: 35,  text: "CALIBRATING NEURAL NETWORK" },
      { at: 1500, pct: 55,  text: "INITIALIZING FACE DETECTOR" },
      { at: 2100, pct: 72,  text: "ESTABLISHING WEBSOCKET" },
      { at: 2700, pct: 88,  text: "PREPARING INTERFACE" },
      { at: 3200, pct: 100, text: "SYSTEM READY" },
    ];

    const timers = stages.map(({ at, pct, text }) =>
      setTimeout(() => {
        setProgress(pct);
        setStatusText(text);
      }, at)
    );

    const exitTimer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 800);
    }, 3900);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <div className={`splash-screen ${fadeOut ? "splash-fade-out" : ""}`}>

      {/* Animated grid background */}
      <div className="splash-grid" />

      {/* Scanning line */}
      <div className="splash-scan-line" />

      {/* Corner brackets */}
      <div className="splash-corner top-left" />
      <div className="splash-corner top-right" />
      <div className="splash-corner bottom-left" />
      <div className="splash-corner bottom-right" />

      {/* Main content */}
      <div className="splash-content">

        {/* Logo */}
        <div className="splash-logo-wrapper">
          <div className="splash-logo">VISION<span>-X</span></div>
          <div className="splash-tagline">// AI EMOTION INTELLIGENCE SYSTEM //</div>
        </div>

        {/* Glowing divider */}
        <div className="splash-divider" />

        {/* Loading bar */}
        <div className="splash-bar-section">
          <div className="splash-bar-label">
            <span className="splash-status-text">{statusText}</span>
            <span className="splash-progress-num">{progress}%</span>
          </div>

          <div className="splash-bar-track">
            <div
              className="splash-bar-fill"
              style={{ width: `${progress}%` }}
            />
            {/* Glowing tip */}
            <div
              className="splash-bar-tip"
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Segment ticks */}
          <div className="splash-bar-ticks">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`splash-tick ${(i + 1) * 5 <= progress ? "tick-active" : ""}`}
              />
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="splash-sys-info">
          <span>VISION-X v1.0.0</span>
          <span className="splash-dot">◆</span>
          <span>FACE DETECTION ENGINE</span>
          <span className="splash-dot">◆</span>
          <span>REAL-TIME ANALYTICS</span>
        </div>

      </div>
    </div>
  );
}

export default SplashScreen;