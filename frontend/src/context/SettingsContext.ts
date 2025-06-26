import { createContext } from "react";

export interface Settings {
  timeout: number;
  message_limit: number;
  message_offset: number;
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  reloadSettings: () => Promise<void>;
  saveSettings: (updates: Partial<Settings>) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);
