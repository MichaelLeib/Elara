import React, { useState, useEffect, useCallback } from "react";
import { getSettings, updateSettings } from "../api/chatApi";
import { SettingsContext, type Settings } from "./SettingsContext";

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getSettings();
      console.log("Settings loaded:", s);
      setSettings(s);
    } catch (e) {
      console.error("Failed to load settings:", e);
      setError("Failed to load settings: " + e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (updates: Partial<Settings>) => {
    setLoading(true);
    setError(null);
    try {
      const s = await updateSettings(updates);
      setSettings(s);
    } catch (e) {
      setError("Failed to save settings: " + e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, error, reloadSettings, saveSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
