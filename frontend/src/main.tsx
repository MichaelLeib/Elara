import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { useModelsStore, useSettingsStore, useChatStore } from "./store";

// Initialize stores
useModelsStore.getState().reloadModels();
useSettingsStore.getState().reloadSettings();
useChatStore.getState().initialize();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
