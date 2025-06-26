/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect, useCallback } from "react";
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
  deleteChatSession,
} from "./api/chatApi";

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
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

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
  }, []);

  const handleSelectChat = useCallback(
    async (sessionId: string) => {
      if (!settings) {
        console.warn("Settings not available yet, skipping chat selection");
        return;
      }

      setSelectedSessionId(sessionId);
      clearMessages(); // Clear previous messages
      console.log("Settings in handleSelectChat:", settings); // Debug log
      await loadMessages(
        sessionId,
        settings,
        settings.message_limit,
        settings.message_offset
      );
    },
    [settings, clearMessages, loadMessages]
  );

  const handleLoadMore = useCallback(async () => {
    if (selectedSessionId && settings) {
      console.log("Settings in handleLoadMore:", settings); // Debug log
      await loadMore(selectedSessionId, settings, settings.message_limit);
    }
  }, [selectedSessionId, settings, loadMore]);

  const handleNewChat = async () => {
    try {
      const response = await createChatSession("New Chat");
      const newSession = response.session;
      setChatSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      clearMessages();
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const handleSendMessage = async (
    message: string,
    model: string,
    attachments?: File[]
  ) => {
    if (!message.trim() || !selectedSessionId) return;

    console.log("Sending message:", { message, model, attachments });

    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      user_id: "user",
      message: message,
      created_at: new Date().toISOString(),
      id: "",
      model: model,
      updated_at: new Date().toISOString(),
    };

    addMessage(userMessage);

    // Add assistant message placeholder
    const assistantMessageId = Date.now().toString();
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
      // Create a custom WebSocket connection with session_id
      const wsUrl = `ws://localhost:8000/api/chat`;
      const ws = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          // Send message with session_id
          ws.send(
            JSON.stringify({
              message,
              model,
              session_id: selectedSessionId,
            })
          );
          console.log("Message sent to WebSocket:", {
            message,
            model,
            session_id: selectedSessionId,
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "chunk") {
              // Update with new chunk
              updateMessage(assistantMessageId, (prevMsg) => ({
                message: (prevMsg?.message || "") + data.content,
              }));
            } else if (data.type === "done") {
              // Mark as complete and preserve message content
              updateMessage(assistantMessageId, (prevMsg) => ({
                message: prevMsg?.message || "",
                updated_at: new Date().toISOString(),
              }));
              ws.close();
              resolve();
            } else if (data.type === "error") {
              // Update the assistant message with error
              updateMessage(assistantMessageId, {
                message: `Error: ${data.content}`,
              });
              ws.close();
              reject(new Error(data.content));
            } else {
              // Fallback for non-streaming responses
              updateMessage(assistantMessageId, {
                message: event.data,
              });
              ws.close();
              resolve();
            }
          } catch {
            // If parsing fails, treat as plain text
            updateMessage(assistantMessageId, {
              message: event.data,
            });
            ws.close();
            resolve();
          }
        };

        ws.onerror = (event) => {
          console.error("WebSocket error:", event);
          reject(new Error("WebSocket connection failed"));
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      updateMessage(assistantMessageId, {
        message: `Sorry, there was an error sending your message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
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

  // Load messages when selected session changes
  useEffect(() => {
    if (selectedSessionId && settings) {
      handleSelectChat(selectedSessionId);
    }
  }, [selectedSessionId, settings, handleSelectChat]);

  return (
    <ErrorBoundary>
      <div css={appStyle}>
        <SidePane
          onSelectChat={handleSelectChat}
          selectedChatIndex={selectedSessionId}
          onNewChat={handleNewChat}
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
