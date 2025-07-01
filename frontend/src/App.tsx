/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { Chat } from "./components/Chat/Chat";
import { SidePane } from "./components/SidePane/SidePane";
import { ErrorBoundary } from "./ErrorBoundary";
import type { Message } from "./components/Chat/models";
import { useChatSessionMessages } from "./hooks/useChatSessionMessages";
import { useSettings } from "./context/useSettings";
import {
  getChatSessions,
  createChatSession,
  createPrivateChatSession,
  deleteChatSession,
} from "./api/chatApi";
import { sendMessageWebSocket } from "./api/chatApi";

const appStyle = css`
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
`;

const appChatContainerStyle = css`
  position: relative;
  display: flex;
  flex-direction: row;
  flex: 1;
  min-width: 0;
  padding: 50px;
  margin: 50px;
`;

const confirmDialogStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const confirmDialogContentStyle = css`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    color: #f1f5f9;
  }
`;

const confirmDialogTitleStyle = css`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #1f2937;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const confirmDialogMessageStyle = css`
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const confirmDialogButtonsStyle = css`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const buttonStyle = (isPrimary: boolean) => css`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  ${isPrimary
    ? `
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    
    &:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    }
  `
    : `
    background: #f3f4f6;
    color: #374151;
    
    &:hover {
      background: #e5e7eb;
    }

    @media (prefers-color-scheme: dark) {
      background: #374151;
      color: #f1f5f9;
      
      &:hover {
        background: #4b5563;
      }
    }
  `}
`;

function App() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [chatSessions, setChatSessions] = useState<
    Array<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      message_count: number;
      is_private?: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);

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

  // Load chat sessions on mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const response = await getChatSessions();
        console.log("Received chat sessions from API:", response.sessions);
        setChatSessions(response.sessions);
        // Select the first session if none is selected
        if (!selectedSessionId && response.sessions.length > 0) {
          setSelectedSessionId(response.sessions[0].id);
        }
      } catch (error) {
        console.error("Error loading chat sessions:", error);
      }
    };
    loadChatSessions();
  }, [selectedSessionId]);

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

  const handleSelectChat = useCallback(
    async (sessionId: string) => {
      if (!settings) {
        console.warn("Settings not available yet, skipping chat selection");
        return;
      }

      setSelectedSessionId(sessionId);
      clearMessages(); // Clear previous messages
      console.log("Settings in handleSelectChat:", settings); // Debug log
    },
    [settings, clearMessages]
  );

  const handleLoadMore = useCallback(async () => {
    if (selectedSessionId && settings) {
      console.log("Settings in handleLoadMore:", settings); // Debug log
      await loadMore(selectedSessionId, settings, settings.message_limit);
    }
  }, [selectedSessionId, settings, loadMore]);

  const handleNewChat = async () => {
    try {
      console.log("Creating new chat with title: New Chat");
      const response = await createChatSession("New Chat");
      console.log("New chat created:", response.session);
      const newSession = response.session;
      setChatSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      clearMessages();
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const handleNewPrivateChat = async () => {
    try {
      const response = await createPrivateChatSession("Private Chat");
      const newSession = response.session;
      setChatSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      clearMessages();
    } catch (error) {
      console.error("Error creating new private chat:", error);
    }
  };

  const handleSendMessage = async (
    message: string,
    model: string,
    attachments?: File[]
  ) => {
    if (!message.trim()) return;

    console.log("Sending message:", { message, model, attachments });

    setIsLoading(true);

    // Create a session if none exists
    let currentSessionId = selectedSessionId;
    let isPrivate = false; // Default to public chat
    if (!currentSessionId) {
      try {
        // Create a meaningful title from the first message
        const title =
          message.length > 50 ? message.substring(0, 50) + "..." : message;
        const response = await createChatSession(title);
        const newSession = response.session;
        setChatSessions((prev) => [newSession, ...prev]);
        setSelectedSessionId(newSession.id);
        currentSessionId = newSession.id;
        clearMessages();
      } catch (error) {
        console.error("Error creating new chat session:", error);
        setIsLoading(false);
        return;
      }
    } else {
      // Check if current session is private
      const currentSession = chatSessions.find(
        (session) => session.id === currentSessionId
      );
      isPrivate = currentSession?.is_private || false;
    }

    // Add user message
    const userMessage: Message = {
      user_id: "user",
      message: message,
      created_at: new Date().toISOString(),
      id: "",
      model: model,
      updated_at: new Date().toISOString(),
      files: attachments?.map((file) => ({
        filename: file.name,
        size: file.size,
        type: file.type,
      })),
    };

    addMessage(userMessage);

    // Add assistant message placeholder
    const assistantMessageId = Date.now().toString();
    currentAssistantMessageIdRef.current = assistantMessageId;
    const assistantMessage: Message = {
      user_id: "assistant",
      message: "",
      created_at: new Date().toISOString(),
      id: assistantMessageId,
      model: model,
      updated_at: new Date().toISOString(),
    };

    addMessage(assistantMessage);

    try {
      await sendMessageWebSocket(
        message,
        model,
        currentSessionId,
        isPrivate,
        attachments,
        (
          chunk: string,
          done: boolean,
          error?: string,
          progress?: number,
          clear?: boolean
        ) => {
          if (error) {
            // Update the assistant message with error
            updateMessage(assistantMessageId, {
              message: `Error: ${error}`,
            });

            // Stop streaming indicator
            window.dispatchEvent(
              new CustomEvent("message-streaming", {
                detail: { isStreaming: false },
              })
            );

            // Clear any progress indicators
            window.dispatchEvent(
              new CustomEvent("document-analysis-progress", {
                detail: { progress: null, text: null },
              })
            );

            setIsLoading(false);
          } else if (done) {
            // For image analysis and other complete messages, update the content
            if (chunk && chunk.trim()) {
              updateMessage(assistantMessageId, {
                message: chunk,
                updated_at: new Date().toISOString(),
              });
            } else {
              // Mark as complete - don't update message content since it's already accumulated
              updateMessage(assistantMessageId, {
                updated_at: new Date().toISOString(),
              });
            }

            // Stop streaming indicator
            window.dispatchEvent(
              new CustomEvent("message-streaming", {
                detail: { isStreaming: false },
              })
            );

            // Clear any progress indicators
            window.dispatchEvent(
              new CustomEvent("document-analysis-progress", {
                detail: { progress: null, text: null },
              })
            );

            setIsLoading(false);
          } else if (clear) {
            // Clear progress signal received - clear the message content and start fresh
            console.log(
              "🔄 [APP] Clear progress signal received, clearing message content"
            );
            updateMessage(assistantMessageId, {
              message: "",
            });

            // Clear progress indicators
            window.dispatchEvent(
              new CustomEvent("document-analysis-progress", {
                detail: { progress: null, text: null },
              })
            );
          } else {
            // Handle progress updates for document analysis
            if (progress !== undefined) {
              console.log(`🔄 [APP] Document analysis progress: ${progress}%`, {
                chunk:
                  chunk?.substring(0, 100) + (chunk?.length > 100 ? "..." : ""),
                progress,
                done,
              });
              // Dispatch progress event for MessageList to listen to
              window.dispatchEvent(
                new CustomEvent("document-analysis-progress", {
                  detail: { progress, text: chunk },
                })
              );

              // For document analysis progress, ONLY update message content if it's actual analysis content
              // NOT status updates (which are handled by the progress event above)
              // Status updates typically contain phrases like "Processing", "Analyzing", etc.
              const isStatusUpdate =
                chunk &&
                (chunk.includes("Processing") ||
                  chunk.includes("Validating") ||
                  chunk.includes("Extracting") ||
                  chunk.includes("Combining") ||
                  chunk.includes("Preparing") ||
                  chunk.includes("Document") ||
                  chunk.includes("chunk") ||
                  chunk.includes("Synthesizing") ||
                  chunk.includes("Streaming") ||
                  chunk.includes("complete") ||
                  // More specific status patterns that are clearly not content
                  chunk.match(
                    /^(Processing|Analyzing|Validating|Extracting|Combining|Preparing|Document|chunk|Synthesizing|Streaming|complete)/i
                  ) ||
                  // Very short messages that are likely status updates
                  (chunk.length < 50 &&
                    chunk.match(
                      /^(Processing|Analyzing|Validating|Extracting|Combining|Preparing|Document|chunk|Synthesizing|Streaming|complete)/i
                    )) ||
                  // Messages that are just status updates without actual content
                  (chunk.length < 100 &&
                    !chunk.includes(".") &&
                    !chunk.includes("!") &&
                    !chunk.includes("?")));

              if (chunk && chunk.trim() && !isStatusUpdate) {
                // This is actual analysis content, not a status update
                updateMessage(assistantMessageId, (prevMsg) => ({
                  message: (prevMsg?.message || "") + chunk,
                }));
              }
            } else {
              // Regular streaming without progress - update with new chunk
              console.log(`🔄 [APP] Regular streaming chunk:`, {
                chunkLength: chunk?.length || 0,
                chunk:
                  chunk?.substring(0, 100) + (chunk?.length > 100 ? "..." : ""),
                done,
              });
              updateMessage(assistantMessageId, (prevMsg) => ({
                message: (prevMsg?.message || "") + chunk,
              }));

              // Dispatch streaming progress event for regular message streaming
              window.dispatchEvent(
                new CustomEvent("message-streaming", {
                  detail: { isStreaming: true, text: chunk },
                })
              );
            }
          }
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      updateMessage(assistantMessageId, {
        message: `Sorry, there was an error sending your message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      // Stop streaming indicator
      window.dispatchEvent(
        new CustomEvent("message-streaming", {
          detail: { isStreaming: false },
        })
      );

      // Clear any progress indicators
      window.dispatchEvent(
        new CustomEvent("document-analysis-progress", {
          detail: { progress: null, text: null },
        })
      );

      setIsLoading(false);
    }
  };

  const handleDeleteChat = (sessionId: string) => {
    setChatToDelete(sessionId);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (chatToDelete === null) return;

    try {
      await deleteChatSession(chatToDelete);
      setChatSessions((prev) =>
        prev.filter((session) => session.id !== chatToDelete)
      );

      // If we deleted the currently selected chat, select the first available one
      if (selectedSessionId === chatToDelete) {
        const remainingSessions = chatSessions.filter(
          (session) => session.id !== chatToDelete
        );
        if (remainingSessions.length > 0) {
          setSelectedSessionId(remainingSessions[0].id);
        } else {
          setSelectedSessionId(null);
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setShowConfirmDialog(false);
      setChatToDelete(null);
    }
  };

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
  }, [updateMessage]);

  // Load messages when selected session changes
  useEffect(() => {
    if (selectedSessionId && settings) {
      clearMessages(); // Clear previous messages
      console.log("Settings in useEffect:", settings); // Debug log
      loadMessages(
        selectedSessionId,
        settings,
        settings.message_limit,
        settings.message_offset
      );
    }
  }, [selectedSessionId, settings, loadMessages, clearMessages]);

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

      {showConfirmDialog && (
        <div css={confirmDialogStyle}>
          <div css={confirmDialogContentStyle}>
            <h3 css={confirmDialogTitleStyle}>Delete Chat</h3>
            <p css={confirmDialogMessageStyle}>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </p>
            <div css={confirmDialogButtonsStyle}>
              <button
                css={buttonStyle(false)}
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
              <button
                css={buttonStyle(true)}
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;
