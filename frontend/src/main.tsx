import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SettingsProvider } from "./context/SettingsContext.tsx";
import { ModelsProvider } from "./context/ModelsContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ModelsProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ModelsProvider>
  </React.StrictMode>
);
