import { create } from "zustand";
import { getModels } from "../api/chatApi";

export interface Model {
  name: string;
  description?: string;
}

interface ModelsState {
  models: Model[];
  loading: boolean;
  error: string | null;
  reloadModels: () => Promise<void>;
}

export const useModelsStore = create<ModelsState>((set) => ({
  models: [],
  loading: false,
  error: null,
  reloadModels: async () => {
    set({ loading: true, error: null });
    try {
      const res = await getModels();
      set({ models: res.models, loading: false });
    } catch (e) {
      set({ error: `Failed to load models: ${e}`, loading: false });
    }
  },
}));
