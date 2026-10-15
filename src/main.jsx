import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// ⚠️ Cố ý KHÔNG bọc <React.StrictMode>: ở dev, StrictMode mount →
// unmount → mount lại, làm socket connect 2 lần gây nhiễu log.
// Demo này dùng useEffect cleanup (socket.disconnect) là đủ gọn.
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
