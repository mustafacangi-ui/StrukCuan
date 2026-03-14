import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { APP_URL, LEGACY_HOST } from "./config/app";

// Domain guard: redirect vercel.app to production so auth sessions stay consistent
if (typeof window !== "undefined" && window.location.hostname === LEGACY_HOST) {
  window.location.replace(`${APP_URL}${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
