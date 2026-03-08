import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeFromStorage } from "./components/configuraciones/ThemeEditor";

// Apply saved theme before render (async, will apply when ready)
initThemeFromStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
