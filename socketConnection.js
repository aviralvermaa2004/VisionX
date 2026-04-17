const WS_URL = "ws://localhost:5000";

export const socket = new WebSocket(WS_URL);

socket.onopen = () => {
  console.log("WebSocket Connected");
};

socket.onerror = (error) => {
  console.log("WebSocket Error:", error);
};

socket.onclose = () => {
  console.log("WebSocket Closed");
};
