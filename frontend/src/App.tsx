/** @jsxImportSource @emotion/react */
import { useEffect, useCallback, useRef, useState } from "react";
import "./App.css";
import { Chat } from "./components/Chat/Chat/Chat";
import { SidePane } from "./components/SidePane/SidePane";
import { ErrorBoundary } from "./ErrorBoundary";
import { ConfirmDialog } from "./components/App/ConfirmDialog";
import { appStyle, appChatContainerStyle } from "./components/App/AppStyles";

import type { PdfChoiceMessage } from "./components/Chat/models";
import { wsManager, setPdfChoiceMessageIdRef } from "./api/chatApi";
import { useSettingsStore, useChatStore, useUIStore } from "./store";

function App() {
  const { settings } = useSettingsStore();
  const { setPdfChoiceId } = useUIStore();

  const {
    messages: currentMessages,
    addMessage,
    updateMessage,
    loadMessages,
    loadMore,
    isLoadingMessages,
    hasMore,
    clearMessages,
    selectedSessionId,
    chatSessions,
    showConfirmDialog,
    handleSelectChat,
    handleNewChat,
    handleNewPrivateChat,
    handleDeleteChat,
    handleDeleteConfirm,
    setShowConfirmDialog,
    isMessageLoading,
    currentAssistantMessageId,
    handleSendMessage,
  } = useChatStore();

  // Separate loading state for PDF analysis
  const [isPdfAnalysisLoading, setIsPdfAnalysisLoading] = useState(false);

  // Combined loading state
  const isLoading = isMessageLoading || isPdfAnalysisLoading;

  // Track the last pdf_choice message ID
  const lastPdfChoiceIdRef = useRef<string | null>(null);

  // Wire up the ref for chatApi
  useEffect(() => {
    setPdfChoiceMessageIdRef(lastPdfChoiceIdRef);
  }, []);

  // Handle PDF choice (OCR vs Vision)
  const handlePdfChoice = useCallback(
    async (msgId: string, choice: "ocr" | "vision") => {
      console.log("🔄 [APP] PDF choice selected:", { msgId, choice });

      // Find the PDF choice message
      const pdfMessage = currentMessages.find(
        (msg) => msg.id === msgId && msg.type === "pdf_choice"
      );
      if (!pdfMessage || pdfMessage.type !== "pdf_choice") {
        console.error("🔄 [APP] PDF choice message not found:", msgId);
        return;
      }

      // Set loading state for PDF analysis
      setIsPdfAnalysisLoading(true);

      // Set the current pdf choice message ID for streaming updates
      lastPdfChoiceIdRef.current = msgId;
      wsManager.setPdfChoiceMessageId(msgId);
      setPdfChoiceId(msgId);

      // Update the message to show the user's choice
      updateMessage(msgId, (prevMsg) => ({
        ...prevMsg!,
        message: `You selected: ${
          choice === "ocr"
            ? "Extract Text (OCR)"
            : "Analyze as Image (Vision Model)"
        }. Processing...`,
      }));

      try {
        // Send the choice to the backend via WebSocket
        const choiceMessage = {
          type: "image_based_pdf_choice",
          choice,
          file_path: pdfMessage.file_path,
          filename: pdfMessage.filename,
          prompt: pdfMessage.prompt,
          model: pdfMessage.model,
          session_id: selectedSessionId,
          isPrivate:
            chatSessions.find((session) => session.id === selectedSessionId)
              ?.is_private || false,
        };
        await wsManager.sendMessage(choiceMessage);
      } catch (error) {
        console.error("🔄 [APP] Error handling PDF choice:", error);
        updateMessage(msgId, (prevMsg) => ({
          ...prevMsg!,
          message: `Error processing ${choice}: ${error}`,
        }));
        // Reset loading state on error
        setIsPdfAnalysisLoading(false);
        wsManager.clearPdfChoiceMessageId();
        setPdfChoiceId(null);
      }
    },
    [
      currentMessages,
      updateMessage,
      selectedSessionId,
      chatSessions,
      setPdfChoiceId,
    ]
  );

  // Load messages when session changes
  useEffect(() => {
    if (selectedSessionId && settings) {
      loadMessages(selectedSessionId, settings, settings.message_limit, 0);
    } else {
      clearMessages();
    }
  }, [selectedSessionId, settings, loadMessages, clearMessages]);

  const handleLoadMore = useCallback(async () => {
    if (selectedSessionId && settings) {
      await loadMore(selectedSessionId, settings, settings.message_limit);
    }
  }, [selectedSessionId, settings, loadMore]);

  // Handle stop analysis requests
  useEffect(() => {
    const handleStopAnalysis = (event: CustomEvent) => {
      console.log("🔄 [APP] Stop analysis requested", event.detail);
      console.log("🔄 [APP] Current loading state:", isLoading);
      // Send stop message to WebSocket
      window.dispatchEvent(
        new CustomEvent("websocket-stop-request", {
          detail: { timestamp: event.detail.timestamp },
        })
      );
      console.log("🔄 [APP] websocket-stop-request event dispatched");
    };

    window.addEventListener(
      "stop-analysis",
      handleStopAnalysis as EventListener
    );
    return () => {
      window.removeEventListener(
        "stop-analysis",
        handleStopAnalysis as EventListener
      );
    };
  }, [isLoading]);

  // Handle web search notifications
  useEffect(() => {
    const handleWebSearch = (event: CustomEvent) => {
      console.log("🔍 [APP] Web search performed:", event.detail);
      const { sources } = event.detail;

      // Add web search sources to the current assistant message
      if (sources && sources.length > 0 && currentAssistantMessageId) {
        updateMessage(currentAssistantMessageId, (prevMsg) => ({
          ...prevMsg,
          web_search_sources: sources,
        }));
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
  }, [currentAssistantMessageId, updateMessage]);

  // Handle memory notifications
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      console.log("🧠 [APP] Memory notification received:", event.detail);
      const { message, saved_items } = event.detail;

      // You can add a toast notification here if needed
      console.log("Memory saved:", { message, saved_items });
    };

    window.addEventListener("memory-saved", handler as EventListener);
    return () => {
      window.removeEventListener("memory-saved", handler as EventListener);
    };
  }, []);

  // Handle image-based PDF choice events
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const detail = event.detail;
      const pdfMsg: PdfChoiceMessage = {
        type: "pdf_choice",
        created_at: new Date().toISOString(),
        id: `pdf-choice-${Date.now()}`,
        user_id: "assistant",
        message: detail.message,
        filename: detail.filename,
        file_path: detail.file_path,
        prompt: detail.prompt,
        model: detail.model,
      };
      addMessage(pdfMsg);
      lastPdfChoiceIdRef.current = pdfMsg.id; // Track the ID
      wsManager.setPdfChoiceMessageId(pdfMsg.id);
    };

    window.addEventListener("image-based-pdf-choice", handler as EventListener);
    return () => {
      window.removeEventListener(
        "image-based-pdf-choice",
        handler as EventListener
      );
    };
  }, [addMessage]);

  // Handle analysis chunk updates
  useEffect(() => {
    const handleAnalysisChunk = (event: CustomEvent) => {
      console.log("🔄 [APP] Analysis chunk received:", event.detail);
      // Accept both id and message_id, and both chunk and content
      const id = event.detail.message_id || event.detail.id;
      const chunk = event.detail.chunk || event.detail.content;
      if (id && chunk) {
        console.log("🔄 [APP] Updating message with chunk:", { id, chunk });
        updateMessage(id, (prevMsg) => ({
          ...prevMsg,
          message: (prevMsg?.message || "") + chunk,
        }));
      }
    };

    window.addEventListener(
      "analysis-chunk",
      handleAnalysisChunk as EventListener
    );
    window.addEventListener(
      "file_analysis_chunk",
      handleAnalysisChunk as EventListener
    );
    return () => {
      window.removeEventListener(
        "analysis-chunk",
        handleAnalysisChunk as EventListener
      );
      window.removeEventListener(
        "file_analysis_chunk",
        handleAnalysisChunk as EventListener
      );
    };
  }, [updateMessage]);

  // Handle analysis complete
  useEffect(() => {
    const handleAnalysisComplete = (event: CustomEvent) => {
      console.log("🔄 [APP] Analysis complete:", event.detail);
      const id = event.detail.message_id || event.detail.id;
      const final_message = event.detail.final_message || event.detail.content;
      if (id && final_message) {
        console.log("🔄 [APP] Updating message with final analysis:", {
          id,
          final_message,
        });
        updateMessage(id, { message: final_message });
      }
      // Reset loading state
      setIsPdfAnalysisLoading(false);
      wsManager.clearPdfChoiceMessageId();
      setPdfChoiceId(null);
    };

    window.addEventListener(
      "analysis-complete",
      handleAnalysisComplete as EventListener
    );
    return () => {
      window.removeEventListener(
        "analysis-complete",
        handleAnalysisComplete as EventListener
      );
    };
  }, [updateMessage, setPdfChoiceId]);

  // Handle WebSocket close
  useEffect(() => {
    const handleWebSocketClose = () => {
      console.log("🔄 [APP] WebSocket closed, resetting loading states");
      setIsPdfAnalysisLoading(false);
      wsManager.clearPdfChoiceMessageId();
      setPdfChoiceId(null);
    };

    window.addEventListener("websocket-closed", handleWebSocketClose);
    return () => {
      window.removeEventListener("websocket-closed", handleWebSocketClose);
    };
  }, [setPdfChoiceId]);

  // Set up event listeners for UI store updates
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      console.log("🔄 [APP] Progress update received:", event.detail);
      const { progress: newProgress, text } = event.detail;
      useUIStore.getState().setProgress(newProgress, text);
    };

    const handleStreamingUpdate = (event: CustomEvent) => {
      console.log("🔄 [APP] Streaming update received:", event.detail);
      useUIStore.getState().setIsStreaming(event.detail.isStreaming);
    };

    const handleStopAnalysis = () => {
      console.log("🔄 [APP] Stop analysis received");
      useUIStore.getState().setIsStopping(true);
    };

    const handleAnalysisComplete = () => {
      console.log("🔄 [APP] Analysis complete received");
      useUIStore.getState().setProgress(null, "");
      useUIStore.getState().setIsStopping(false);
    };

    const handleWebSocketClose = () => {
      console.log("🔄 [APP] WebSocket closed received");
      useUIStore.getState().setProgress(null, "");
      useUIStore.getState().setIsStopping(false);
    };

    // Add event listeners
    window.addEventListener(
      "document-analysis-progress",
      handleProgressUpdate as EventListener
    );
    window.addEventListener(
      "message-streaming",
      handleStreamingUpdate as EventListener
    );
    window.addEventListener(
      "stop-analysis",
      handleStopAnalysis as EventListener
    );
    window.addEventListener(
      "analysis-complete",
      handleAnalysisComplete as EventListener
    );
    window.addEventListener(
      "websocket-closed",
      handleWebSocketClose as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "document-analysis-progress",
        handleProgressUpdate as EventListener
      );
      window.removeEventListener(
        "message-streaming",
        handleStreamingUpdate as EventListener
      );
      window.removeEventListener(
        "stop-analysis",
        handleStopAnalysis as EventListener
      );
      window.removeEventListener(
        "analysis-complete",
        handleAnalysisComplete as EventListener
      );
      window.removeEventListener(
        "websocket-closed",
        handleWebSocketClose as EventListener
      );
    };
  }, []);

  return (
    <ErrorBoundary>
      <div css={appStyle}>
        <SidePane
          selectedChatIndex={selectedSessionId}
          chatSessions={chatSessions}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onNewPrivateChat={handleNewPrivateChat}
          onDeleteChat={handleDeleteChat}
        />
        <div css={appChatContainerStyle}>
          <Chat
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            onLoadMore={handleLoadMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMessages}
            hasMore={hasMore}
            handlePdfChoice={handlePdfChoice}
            onNewChat={handleNewChat}
            isPrivate={
              chatSessions.find((session) => session.id === selectedSessionId)
                ?.is_private || false
            }
            currentSessionModel={
              chatSessions.find((session) => session.id === selectedSessionId)
                ?.model
            }
          />
        </div>
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowConfirmDialog(false)}
          title="Delete Chat"
          message="Are you sure you want to delete this chat? This action cannot be undone."
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
