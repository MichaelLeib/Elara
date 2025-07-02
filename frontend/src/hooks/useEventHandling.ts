import { useEffect, useState } from "react";

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

interface UseEventHandlingReturn {
  progress: number | null;
  progressText: string;
  isStreaming: boolean;
  memoryNotification: MemoryNotification;
  isStopping: boolean;
  webSearchStatus: WebSearchStatus;
  setProgress: (progress: number | null) => void;
  setProgressText: (text: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setMemoryNotification: (notification: MemoryNotification) => void;
  setIsStopping: (stopping: boolean) => void;
  setWebSearchStatus: (status: WebSearchStatus) => void;
  handleMemoryNotificationClose: () => void;
  handleStopAnalysis: () => void;
}

export const useEventHandling = (): UseEventHandlingReturn => {
  const [progress, setProgress] = useState<number | null>(null);
  const [progressText, setProgressText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [memoryNotification, setMemoryNotification] =
    useState<MemoryNotification>({
      isVisible: false,
      message: "",
      savedItems: [],
    });
  const [isStopping, setIsStopping] = useState(false);
  const [webSearchStatus, setWebSearchStatus] = useState<WebSearchStatus>({
    isSearching: false,
  });

  // Handle progress updates for document analysis
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      const { progress: newProgress, text } = event.detail;
      setProgress(newProgress);
      if (text) {
        setProgressText(text);
      }
    };

    window.addEventListener(
      "document-analysis-progress",
      handleProgressUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "document-analysis-progress",
        handleProgressUpdate as EventListener
      );
    };
  }, []);

  // Handle streaming state updates
  useEffect(() => {
    const handleStreamingUpdate = (event: CustomEvent) => {
      setIsStreaming(event.detail.isStreaming);
    };

    window.addEventListener(
      "message-streaming",
      handleStreamingUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "message-streaming",
        handleStreamingUpdate as EventListener
      );
    };
  }, []);

  // Handle web search notifications
  useEffect(() => {
    const handleWebSearch = (event: CustomEvent) => {
      const { search_terms, done } = event.detail;

      if (done) {
        // Web search completed
        setWebSearchStatus({ isSearching: false });
      } else {
        // Web search started
        setWebSearchStatus({
          isSearching: true,
          searchTerms: search_terms,
        });
      }
    };

    window.addEventListener(
      "web-search-performed",
      handleWebSearch as EventListener
    );
    return () => {
      window.removeEventListener(
        "web-search-performed",
        handleWebSearch as EventListener
      );
    };
  }, []);

  // Handle memory update notifications
  useEffect(() => {
    const handleMemoryUpdate = (event: CustomEvent) => {
      const { content, saved_items } = event.detail;
      setMemoryNotification({
        isVisible: true,
        message: content,
        savedItems: saved_items || [],
      });
    };

    window.addEventListener(
      "memory-updated",
      handleMemoryUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "memory-updated",
        handleMemoryUpdate as EventListener
      );
    };
  }, []);

  const handleMemoryNotificationClose = () => {
    setMemoryNotification((prev) => ({ ...prev, isVisible: false }));
  };

  const handleStopAnalysis = () => {
    console.log("🔄 [STOP] Stop analysis requested");
    console.log("🔄 [STOP] Current state:", {
      progress,
      isStreaming,
    });

    // Set stopping state
    setIsStopping(true);
    setProgressText("Stopping analysis...");

    // Dispatch a custom event that the parent component can listen to
    window.dispatchEvent(
      new CustomEvent("stop-analysis", {
        detail: { timestamp: Date.now() },
      })
    );
  };

  return {
    progress,
    progressText,
    isStreaming,
    memoryNotification,
    isStopping,
    webSearchStatus,
    setProgress,
    setProgressText,
    setIsStreaming,
    setMemoryNotification,
    setIsStopping,
    setWebSearchStatus,
    handleMemoryNotificationClose,
    handleStopAnalysis,
  };
};
