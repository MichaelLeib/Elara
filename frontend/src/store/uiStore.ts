import { create } from "zustand";

interface MemoryNotification {
  isVisible: boolean;
  message: string;
  savedItems: Array<{
    key: string;
    value: string;
    action: string;
    reason: string;
  }>;
}

interface WebSearchStatus {
  isSearching: boolean;
  searchTerms?: string;
}

interface UIState {
  // Progress and streaming
  progress: number | null;
  progressText: string;
  isStreaming: boolean;
  isStopping: boolean;

  // PDF choice
  pdfChoiceId: string | null;

  // Memory notification
  memoryNotification: MemoryNotification;

  // Web search
  webSearchStatus: WebSearchStatus;

  // Actions
  setProgress: (progress: number | null, text?: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsStopping: (isStopping: boolean) => void;
  setPdfChoiceId: (id: string | null) => void;
  setMemoryNotification: (notification: MemoryNotification) => void;
  setWebSearchStatus: (status: WebSearchStatus) => void;

  // Event handlers
  handleProgressUpdate: (event: CustomEvent) => void;
  handleStreamingUpdate: (event: CustomEvent) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  progress: null,
  progressText: "",
  isStreaming: false,
  isStopping: false,
  pdfChoiceId: null,
  memoryNotification: {
    isVisible: false,
    message: "",
    savedItems: [],
  },
  webSearchStatus: {
    isSearching: false,
  },

  // Actions
  setProgress: (progress: number | null, text?: string) => {
    set({ progress, progressText: text || "" });
  },

  setIsStreaming: (isStreaming: boolean) => {
    set({ isStreaming });
  },

  setIsStopping: (isStopping: boolean) => {
    set({ isStopping });
  },

  setPdfChoiceId: (id: string | null) => {
    set({ pdfChoiceId: id });
  },

  setMemoryNotification: (notification: MemoryNotification) => {
    set({ memoryNotification: notification });
  },

  setWebSearchStatus: (status: WebSearchStatus) => {
    set({ webSearchStatus: status });
  },

  // Event handlers
  handleProgressUpdate: (event: CustomEvent) => {
    const { progress: newProgress, text } = event.detail;
    set({ progress: newProgress, progressText: text || "" });
  },

  handleStreamingUpdate: (event: CustomEvent) => {
    set({ isStreaming: event.detail.isStreaming });
  },
}));
