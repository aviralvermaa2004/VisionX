const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------
// Root Route (for testing in browser)
// ----------------------
app.get("/", (req, res) => {
  res.send("Vision-X Backend Running Successfully 🚀");
});

// ----------------------
// Create HTTP Server
// ----------------------
const server = http.createServer(app);

// ----------------------
// Attach WebSocket Server
// ----------------------
const wss = new WebSocket.Server({ server });

console.log("WebSocket Server Initialized");

// ----------------------
// WebSocket Logic
// ----------------------
wss.on("connection", (ws) => {
  console.log("Client Connected via WebSocket");

  ws.on("message", (data) => {
    try {
      const emotionData = JSON.parse(data.toString());
      console.log("Received Emotion:", emotionData);

      // Broadcast to all connected clients (Dashboard + others)
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(emotionData));
        }
      });

    } catch (err) {
      console.log("Invalid JSON received");
    }
  });

  ws.on("close", () => {
    console.log("WebSocket Client Disconnected");
  });

  ws.on("error", (err) => {
    console.log("WebSocket Error:", err.message);
  });
});

// ----------------------
// Start Server
// ----------------------
const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
