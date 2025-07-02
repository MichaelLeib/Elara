import { useCallback, useState } from "react";
import {
  downloadModel,
  getAvailableModels,
  getMemory,
  removeModel,
  saveMemory,
} from "../api/chatApi";
import type { AvailableModel, MemoryEntry, SystemInfo } from "../api/models";

export interface UseSettingsDialogReturn {
  // Memory state
  memoryEntries: MemoryEntry[];
  isMemoryLoading: boolean;
  memoryError: string | null;

  // Models state
  availableModels: AvailableModel[];
  isModelsLoading: boolean;
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

  // Data loading
  loadData: () => Promise<void>;
}

export const useSettingsDialog = (): UseSettingsDialogReturn => {
  // Memory state
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  // Models state
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(
    new Set()
  );
  const [removingModels, setRemovingModels] = useState<Set<string>>(new Set());

  // System info state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isSystemInfoLoading, setIsSystemInfoLoading] = useState(false);
  const [systemInfoError, setSystemInfoError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Load memory entries
      setIsMemoryLoading(true);
      setMemoryError(null);
      const memoryResponse = await getMemory();
      setMemoryEntries(memoryResponse.entries);

      // Load available models
      setIsModelsLoading(true);
      setModelsError(null);
      const modelsResponse = await getAvailableModels();
      setAvailableModels(modelsResponse.available_models);

      // Load system info
      setIsSystemInfoLoading(true);
      setSystemInfoError(null);
      setSystemInfo(modelsResponse.system_info);
    } catch (error) {
      console.error("Error loading settings data:", error);
      setMemoryError("Failed to load memory entries");
      setModelsError("Failed to load models");
      setSystemInfoError("Failed to load system info");
    } finally {
      setIsMemoryLoading(false);
      setIsModelsLoading(false);
      setIsSystemInfoLoading(false);
    }
  }, []);

  const addMemoryEntry = useCallback(() => {
    setMemoryEntries((prev) => [
      ...prev,
      { key: "", value: "", importance: "medium" },
    ]);
  }, []);

  const updateMemoryEntry = useCallback(
    (index: number, field: "key" | "value" | "importance", value: string) => {
      setMemoryEntries((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        )
      );
    },
    []
  );

  const removeMemoryEntry = useCallback((index: number) => {
    setMemoryEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveMemoryEntries = useCallback(async () => {
    try {
      setMemoryError(null);
      await saveMemory(memoryEntries);
    } catch (error) {
      console.error("Error saving memory entries:", error);
      setMemoryError("Failed to save memory entries");
    }
  }, [memoryEntries]);

  const downloadModelHandler = useCallback(async (modelName: string) => {
    try {
      setDownloadingModels((prev) => new Set(prev).add(modelName));
      await downloadModel(modelName);

      // Refresh models list
      const updatedModelsResponse = await getAvailableModels();
      setAvailableModels(updatedModelsResponse.available_models);
    } catch (error) {
      console.error("Error downloading model:", error);
      setModelsError(`Failed to download ${modelName}`);
    } finally {
      setDownloadingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  }, []);

  const removeModelHandler = useCallback(async (modelName: string) => {
    try {
      setRemovingModels((prev) => new Set(prev).add(modelName));
      await removeModel(modelName);

      // Refresh models list
      const updatedModelsResponse = await getAvailableModels();
      setAvailableModels(updatedModelsResponse.available_models);
    } catch (error) {
      console.error("Error removing model:", error);
      setModelsError(`Failed to remove ${modelName}`);
    } finally {
      setRemovingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  }, []);

  return {
    // Memory state
    memoryEntries,
    isMemoryLoading,
    memoryError,

    // Models state
    availableModels,
    isModelsLoading,
    modelsError,
    downloadingModels,
    removingModels,

    // System info state
    systemInfo,
    isSystemInfoLoading,
    systemInfoError,

    // Memory actions
    addMemoryEntry,
    updateMemoryEntry,
    removeMemoryEntry,
    saveMemoryEntries,

    // Model actions
    downloadModelHandler,
    removeModelHandler,

    // Data loading
    loadData,
  };
};
