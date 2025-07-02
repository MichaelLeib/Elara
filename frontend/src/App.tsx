/** @jsxImportSource @emotion/react */
import { useEffect, useCallback } from "react";
import "./App.css";
import { Chat } from "./components/Chat/Chat";
import { SidePane } from "./components/SidePane/SidePane";
import { ErrorBoundary } from "./ErrorBoundary";
import { useChatSessionMessages } from "./hooks/useChatSessionMessages";
import { useSettings } from "./context/useSettings";
import { useChatSessionManagement } from "./hooks/useChatSessionManagement";
import { useMessageSending } from "./hooks/useMessageSending";
import { ConfirmDialog } from "./components/App/ConfirmDialog";
import { appStyle, appChatContainerStyle } from "./components/App/AppStyles";

function App() {
  const { settings } = useSettings();

  const {
    messages: currentMessages,
    addMessage,
    updateMessage,
    loadMessages,
    loadMore,
    isLoading: isLoadingMessages,
    hasMore,
    clearMessages,
  } = useChatSessionMessages();

  // Chat session management
  const {
    selectedSessionId,
    chatSessions,
    showConfirmDialog,
    handleSelectChat,
    handleNewChat,
    handleNewPrivateChat,
    handleDeleteChat,
    handleDeleteConfirm,
    setShowConfirmDialog,
  } = useChatSessionManagement();

  // Message sending
  const { isLoading, currentAssistantMessageIdRef, handleSendMessage } =
    useMessageSending({
      selectedSessionId,
      chatSessions,
      addMessage,
      updateMessage,
      clearMessages,
      createChatSession: async (title: string) => {
        const { createChatSession } = await import("./api/chatApi");
        return createChatSession(title);
      },
    });

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
      // Send stop message to WebSocket - we'll need to access it through a global store
      // For now, we'll dispatch an event that the WebSocket handler can listen to
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
      if (
        sources &&
        sources.length > 0 &&
        currentAssistantMessageIdRef.current
      ) {
        updateMessage(currentAssistantMessageIdRef.current, (prevMsg) => ({
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
  }, [updateMessage, currentAssistantMessageIdRef]);

  return (
    <ErrorBoundary>
      <div css={appStyle}>
        <SidePane
          onSelectChat={handleSelectChat}
          selectedChatIndex={selectedSessionId}
          onNewChat={handleNewChat}
          onNewPrivateChat={handleNewPrivateChat}
          onDeleteChat={handleDeleteChat}
          chatSessions={chatSessions}
        />
        <div css={appChatContainerStyle}>
          <Chat
            messages={currentMessages}
            isLoading={isLoading || isLoadingMessages}
            onNewChat={handleNewChat}
            onSendMessage={handleSendMessage}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMessages}
            isPrivate={
              chatSessions.find((session) => session.id === selectedSessionId)
                ?.is_private || false
            }
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirmDialog(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </ErrorBoundary>
  );
}

export default App;
