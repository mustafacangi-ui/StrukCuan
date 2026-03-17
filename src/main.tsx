import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { APP_URL, IS_LOCALHOST, REDIRECT_HOSTS } from "./config/app";

// Localhost: ASLA dış linke yönlendirme - lokal test için kal
// Domain guard: sadece production dışı hostlarda (localhost hariç) www.strukcuan.com'a yönlendir
if (typeof window !== "undefined" && !IS_LOCALHOST && REDIRECT_HOSTS.includes(window.location.hostname)) {
  window.location.replace(`${APP_URL}${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
