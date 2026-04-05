import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

const isLovablePreviewHost = /(?:^|\.)lovableproject\.com$/i.test(window.location.hostname);
const shouldRegisterServiceWorker = import.meta.env.PROD && !isLovablePreviewHost;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (shouldRegisterServiceWorker) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // no-op: non-blocking progressive enhancement
      });
      return;
    }

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);

    if ("caches" in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }
  });
}
