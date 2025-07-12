import { create } from "zustand";
import {
  downloadModel,
  getAvailableModels,
  getInstalledModels,
  getMemory,
  removeModel,
  saveMemory,
} from "../api/chatApi";
import type { AvailableModel, MemoryEntry, SystemInfo } from "../api/models";

interface SettingsDialogState {
  // Memory state
  memoryEntries: MemoryEntry[];
  isMemoryLoading: boolean;
  memoryError: string | null;

  // Models state
  availableModels: AvailableModel[];
  installedModels: AvailableModel[];
  isModelsLoading: boolean;
  isInstalledModelsLoading: boolean;
  modelsError: string | null;
  downloadingModels: Set<string>;
  removingModels: Set<string>;

  // System info state
  systemInfo: SystemInfo | null;
  isSystemInfoLoading: boolean;
  systemInfoError: string | null;

  // Memory actions
  addMemoryEntry: () => void;
  updateMemoryEntry: (
    index: number,
    field: "key" | "value" | "importance",
    value: string
  ) => void;
  removeMemoryEntry: (index: number) => void;
  saveMemoryEntries: () => Promise<void>;

  // Model actions
  downloadModelHandler: (modelName: string) => Promise<void>;
  removeModelHandler: (modelName: string) => Promise<void>;
  loadInstalledModels: () => Promise<void>;

  // Data loading
  loadData: () => Promise<void>;
}

export const useSettingsDialogStore = create<SettingsDialogState>(
  (set, get) => ({
    // Initial state
    memoryEntries: [],
    isMemoryLoading: false,
    memoryError: null,
    availableModels: [],
    installedModels: [],
    isModelsLoading: false,
    isInstalledModelsLoading: false,
    modelsError: null,
    downloadingModels: new Set(),
    removingModels: new Set(),
    systemInfo: null,
    isSystemInfoLoading: false,
    systemInfoError: null,

    // Memory actions
    addMemoryEntry: () => {
      set((state) => ({
        memoryEntries: [
          ...state.memoryEntries,
          { key: "", value: "", importance: "medium" },
        ],
      }));
    },

    updateMemoryEntry: (
      index: number,
      field: "key" | "value" | "importance",
      value: string
    ) => {
      set((state) => ({
        memoryEntries: state.memoryEntries.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        ),
      }));
    },

    removeMemoryEntry: (index: number) => {
      set((state) => ({
        memoryEntries: state.memoryEntries.filter((_, i) => i !== index),
      }));
    },

    saveMemoryEntries: async () => {
      const { memoryEntries } = get();
      set({ isMemoryLoading: true, memoryError: null });
      try {
        await saveMemory(memoryEntries);
      } catch (error) {
        console.error("Error saving memory entries:", error);
        set({ memoryError: "Failed to save memory entries" });
      } finally {
        set({ isMemoryLoading: false });
      }
    },

    // Model actions
    downloadModelHandler: async (modelName: string) => {
      try {
        set((state) => ({
          downloadingModels: new Set(state.downloadingModels).add(modelName),
        }));
        await downloadModel(modelName);

        // Refresh both available and installed models lists
        const updatedModelsResponse = await getAvailableModels();
        set({
          availableModels: updatedModelsResponse.available_models,
          installedModels: updatedModelsResponse.installed_models || [],
        });
      } catch (error) {
        console.error("Error downloading model:", error);
        set({ modelsError: `Failed to download ${modelName}` });
      } finally {
        set((state) => {
          const newSet = new Set(state.downloadingModels);
          newSet.delete(modelName);
          return { downloadingModels: newSet };
        });
      }
    },

    removeModelHandler: async (modelName: string) => {
      try {
        set((state) => ({
          removingModels: new Set(state.removingModels).add(modelName),
        }));
        await removeModel(modelName);

        // Refresh both available and installed models lists
        const updatedModelsResponse = await getAvailableModels();
        set({
          availableModels: updatedModelsResponse.available_models,
          installedModels: updatedModelsResponse.installed_models || [],
        });
      } catch (error) {
        console.error("Error removing model:", error);
        set({ modelsError: `Failed to remove ${modelName}` });
      } finally {
        set((state) => {
          const newSet = new Set(state.removingModels);
          newSet.delete(modelName);
          return { removingModels: newSet };
        });
      }
    },

    loadInstalledModels: async () => {
      try {
        set({ isInstalledModelsLoading: true });
        const installedModels = await getInstalledModels();
        set({ installedModels });
      } catch (error) {
        console.error("Error loading installed models:", error);
        set({ modelsError: "Failed to load installed models" });
      } finally {
        set({ isInstalledModelsLoading: false });
      }
    },

    // Data loading
    loadData: async () => {
      try {
        // Load memory entries
        set({ isMemoryLoading: true, memoryError: null });
        const memoryResponse = await getMemory();
        set({ memoryEntries: memoryResponse.entries, isMemoryLoading: false });

        // Load available models
        set({ isModelsLoading: true, modelsError: null });
        const modelsResponse = await getAvailableModels();
        set({
          availableModels: modelsResponse.available_models,
          isModelsLoading: false,
        });

        // Load installed models
        set({ isInstalledModelsLoading: true });
        const installedModels = await getInstalledModels();
        set({ installedModels, isInstalledModelsLoading: false });

        // Load system info
        set({ isSystemInfoLoading: true, systemInfoError: null });
        set({
          systemInfo: modelsResponse.system_info,
          isSystemInfoLoading: false,
        });
      } catch (error) {
        console.error("Error loading settings data:", error);
        set({
          memoryError: "Failed to load memory entries",
          modelsError: "Failed to load models",
          systemInfoError: "Failed to load system info",
          isMemoryLoading: false,
          isModelsLoading: false,
          isInstalledModelsLoading: false,
          isSystemInfoLoading: false,
        });
      }
    },
  })
);
