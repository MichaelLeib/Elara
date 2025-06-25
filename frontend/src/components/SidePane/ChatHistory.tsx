/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect } from "react";
import { Icon } from "../UI/Icon";

interface ChatSession {
  index: number;
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatHistoryProps {
  onSelectChat: (chatIndex: number) => void;
  selectedChatIndex: number | null;
  onNewChat: () => void;
  onDeleteChat: (chatIndex: number) => void;
}

const containerStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-right: 1px solid #e2e8f0;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);

  @media (prefers-color-scheme: dark) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(30, 41, 59, 0.8);
  }
`;

const titleStyle = css`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const newChatButtonStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);

  &:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
`;

const chatListStyle = css`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 2px;

    @media (prefers-color-scheme: dark) {
      background: rgba(75, 85, 99, 0.3);
    }
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);

    @media (prefers-color-scheme: dark) {
      background: rgba(75, 85, 99, 0.5);
    }
  }
`;

const chatItemStyle = (isSelected: boolean) => css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 0.75rem;
  background: ${isSelected
    ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
    : "rgba(255, 255, 255, 0.8)"};
  color: ${isSelected ? "white" : "#1f2937"};
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  border: 1px solid ${isSelected ? "transparent" : "#e2e8f0"};
  backdrop-filter: blur(8px);

  @media (prefers-color-scheme: dark) {
    background: ${isSelected
      ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
      : "rgba(30, 41, 59, 0.8)"};
    color: ${isSelected ? "white" : "#f1f5f9"};
    border: 1px solid ${isSelected ? "transparent" : "rgba(255, 255, 255, 0.1)"};
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    @media (prefers-color-scheme: dark) {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    button {
      opacity: 1;
    }
  }
`;

const chatInfoStyle = css`
  flex: 1;
  min-width: 0;
`;

const chatTitleStyle = css`
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const chatMetaStyle = css`
  font-size: 0.75rem;
  opacity: 0.7;
  margin: 0;
`;

const deleteButtonStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
  opacity: 0;
  margin-left: 0.5rem;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`;

const emptyStateStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #6b7280;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const emptyStateIconStyle = css`
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const editInputStyle = css`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  background: white;
  color: #1f2937;

  @media (prefers-color-scheme: dark) {
    background: #374151;
    border-color: #4b5563;
    color: #f1f5f9;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export function ChatHistory({
  onSelectChat,
  selectedChatIndex,
  onNewChat,
  onDeleteChat,
}: ChatHistoryProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChatIndex, setEditingChatIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchChatSessions = async () => {
    try {
      const response = await fetch("/api/chat-sessions");
      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatSessions();
  }, []);

  useEffect(() => {
    const handleRefreshChatList = () => {
      fetchChatSessions();
    };

    window.addEventListener("refreshChatList", handleRefreshChatList);

    return () => {
      window.removeEventListener("refreshChatList", handleRefreshChatList);
    };
  }, []);

  const handleChatClick = (chatIndex: number) => {
    onSelectChat(chatIndex);
  };

  const handleNewChatClick = async () => {
    await onNewChat();
    // Refresh the chat list after creating a new chat
    await fetchChatSessions();
  };

  const handleDeleteClick = (e: React.MouseEvent, chatIndex: number) => {
    e.stopPropagation();
    onDeleteChat(chatIndex);
  };

  const handleEditSave = async () => {
    if (editingChatIndex === null) return;

    try {
      const response = await fetch(
        `/api/chat-sessions/${editingChatIndex}/title`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: editingTitle }),
        }
      );

      if (response.ok) {
        setChatSessions((prev) =>
          prev.map((chat) =>
            chat.index === editingChatIndex
              ? { ...chat, title: editingTitle }
              : chat
          )
        );
      }
    } catch (error) {
      console.error("Error updating chat title:", error);
    } finally {
      setEditingChatIndex(null);
      setEditingTitle("");
    }
  };

  const handleEditCancel = () => {
    setEditingChatIndex(null);
    setEditingTitle("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSave();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (loading) {
    return (
      <div css={containerStyle}>
        <div css={headerStyle}>
          <h2 css={titleStyle}>Chat History</h2>
        </div>
        <div css={emptyStateStyle}>
          <div css={emptyStateIconStyle}>⏳</div>
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div css={containerStyle}>
      <div css={headerStyle}>
        <h2 css={titleStyle}>Chats</h2>
        <button
          css={newChatButtonStyle}
          onClick={handleNewChatClick}
          title="New Chat"
        >
          <Icon
            name="plus"
            size={16}
          />
        </button>
      </div>

      <div css={chatListStyle}>
        {chatSessions.length === 0 ? (
          <div css={emptyStateStyle}>
            <div css={emptyStateIconStyle}>💬</div>
            <p>No chats yet</p>
            <p>Start a new conversation to see it here</p>
          </div>
        ) : (
          chatSessions.map((chat) => (
            <div
              key={chat.index}
              css={chatItemStyle(selectedChatIndex === chat.index)}
              onClick={() => handleChatClick(chat.index)}
            >
              <div css={chatInfoStyle}>
                {editingChatIndex === chat.index ? (
                  <input
                    css={editInputStyle}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditSave}
                    autoFocus
                  />
                ) : (
                  <>
                    <h3 css={chatTitleStyle}>{chat.title}</h3>
                    <p css={chatMetaStyle}>
                      {chat.message_count} messages •{" "}
                      {formatDate(chat.updated_at)}
                    </p>
                  </>
                )}
              </div>

              {editingChatIndex !== chat.index && (
                <div css={{ display: "flex", alignItems: "center" }}>
                  <button
                    css={deleteButtonStyle}
                    onClick={(e) => handleDeleteClick(e, chat.index)}
                    title="Delete chat"
                  >
                    <Icon
                      name="trash"
                      size={14}
                    />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
