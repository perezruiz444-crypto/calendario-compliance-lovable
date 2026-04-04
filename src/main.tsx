import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD,          // disabled in dev/CI
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,                  // 10% of transactions
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

// Clean up any residual theme styles from previous theme editor
document.documentElement.removeAttribute('style');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
