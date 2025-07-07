import { create } from "zustand";
import { getSettings, updateSettings } from "../api/chatApi";

export interface Settings {
  timeout: number;
  message_limit: number;
  message_offset: number;
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  CHAT_MODEL: string;
  FAST_MODEL: string;
  SUMMARY_MODEL: string;
  USER_INFO_EXTRACTION_MODEL: string;
  WEB_SEARCH_DECISION_MODEL: string;
  DOCUMENT_ANALYSIS_MODEL: string;
  VISION_DEFAULT_MODEL: string;
  VISION_FALLBACK_MODELS: string[];
  manual_model_switch: boolean;
  auto_model_selection: boolean;
  summarization_prompt: string;
  user_info_extraction_model: string; // "adaptive", "fast", "quality"
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  reloadSettings: () => Promise<void>;
  saveSettings: (updates: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,
  error: null,
  reloadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const s = await getSettings();
      console.log("Settings loaded:", s);
      set({ settings: s, loading: false });
    } catch (e) {
      console.error("Failed to load settings:", e);
      set({ error: `Failed to load settings: ${e}`, loading: false });
    }
  },
  saveSettings: async (updates: Partial<Settings>) => {
    set({ loading: true, error: null });
    try {
      const s = await updateSettings(updates);
      set({ settings: s, loading: false });
    } catch (e) {
      set({ error: `Failed to save settings: ${e}`, loading: false });
    }
  },
}));
