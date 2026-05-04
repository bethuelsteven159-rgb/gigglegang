const LOCAL_API_URL = "http://localhost:5000";
const LIVE_API_URL = "https://YOUR_RENDER_BACKEND_URL.onrender.com";

export const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? LOCAL_API_URL
    : LIVE_API_URL;