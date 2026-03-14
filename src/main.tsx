import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { APP_URL, REDIRECT_HOSTS } from "./config/app";

// Domain guard: redirect non-production hosts so auth runs only on www.strukcuan.com
if (typeof window !== "undefined" && REDIRECT_HOSTS.includes(window.location.hostname)) {
  window.location.replace(`${APP_URL}${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
